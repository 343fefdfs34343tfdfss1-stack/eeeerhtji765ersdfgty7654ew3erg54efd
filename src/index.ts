import {
  Client,
  Events,
  GatewayIntentBits,
  GuildMember,
  PermissionFlagsBits
} from "discord.js";
import { config } from "./config.js";
import {
  addRobloxUser,
  getRobloxUsers,
  removeExactRobloxUser,
  replaceRobloxUsers,
  validateUserList
} from "./github.js";
import { makeRobloxUser } from "./target.js";
import {
  addUserModal,
  dashboardMessage,
  fullJsonModal,
  homeButtonRow,
  profileConfirmation,
  statusEmbed
} from "./dashboard.js";
import { resolveRobloxUser } from "./roblox.js";
import {
  decodeRemovalUser,
  removalConfirmation,
  removalListMessage
} from "./removal.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function isAllowed(member: GuildMember) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles.cache.some((role) => config.allowedRoleIds.has(role.id));
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.inCachedGuild() || !interaction.isRepliable()) return;

  try {
    if (!isAllowed(interaction.member)) {
      await interaction.reply({
        embeds: [statusEmbed("Permission Denied", "You do not have permission to edit this list.", true)],
        ephemeral: true
      });
      return;
    }

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "users") {
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply(await dashboardMessage(await getRobloxUsers()));
        return;
      }

      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === "users:home") {
        await interaction.deferUpdate();
        await interaction.editReply(await dashboardMessage(await getRobloxUsers()));
      } else if (interaction.customId.startsWith("remove:list:")) {
        const page = Number(interaction.customId.split(":")[2]);
        if (!Number.isInteger(page)) throw new Error("That list page is invalid.");
        await interaction.deferUpdate();
        await interaction.editReply(await removalListMessage(await getRobloxUsers(), page));
      } else if (interaction.customId.startsWith("remove:cancel:")) {
        const page = Number(interaction.customId.split(":")[2]);
        if (!Number.isInteger(page)) throw new Error("That list page is invalid.");
        await interaction.deferUpdate();
        await interaction.editReply(await removalListMessage(await getRobloxUsers(), page));
      } else if (interaction.customId.startsWith("remove:confirm:")) {
        const [, , pageValue, identity] = interaction.customId.split(":");
        const page = Number(pageValue);
        if (!Number.isInteger(page) || !identity) throw new Error("That removal confirmation is invalid.");
        const user = decodeRemovalUser(identity);
        await interaction.deferUpdate();
        const list = await removeExactRobloxUser(user);
        await interaction.editReply(await dashboardMessage(list, "User removed successfully."));
      } else if (interaction.customId.startsWith("users:confirm-add:")) {
        const [, , userId, username] = interaction.customId.split(":");
        if (!userId || !username) throw new Error("This confirmation is invalid. Start again.");
        await interaction.deferUpdate();
        const profile = await resolveRobloxUser(username, userId);
        const list = await addRobloxUser(makeRobloxUser(profile.username, profile.id));
        await interaction.editReply(await dashboardMessage(list, "Verified Roblox user added successfully."));
      } else if (interaction.customId === "users:cancel-add") {
        await interaction.deferUpdate();
        await interaction.editReply(await dashboardMessage(await getRobloxUsers(), "Add cancelled."));
      } else if (interaction.customId === "users:add") {
        await interaction.showModal(addUserModal());
      } else if (interaction.customId === "users:remove") {
        await interaction.deferUpdate();
        await interaction.editReply(await removalListMessage(await getRobloxUsers()));
      } else if (interaction.customId === "users:json") {
        await interaction.showModal(fullJsonModal(await getRobloxUsers()));
      } else if (interaction.customId.startsWith("users:page:")) {
        const page = Number(interaction.customId.split(":")[2]);
        if (!Number.isInteger(page)) throw new Error("That list page is invalid.");
        await interaction.deferUpdate();
        await interaction.editReply(await dashboardMessage(await getRobloxUsers(), undefined, page));
      } else if (interaction.customId.startsWith("users:refresh:")) {
        const page = Number(interaction.customId.split(":")[2]);
        if (!Number.isInteger(page)) throw new Error("That list page is invalid.");
        await interaction.deferUpdate();
        await interaction.editReply(await dashboardMessage(await getRobloxUsers(), "List refreshed.", page));
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("remove:select:")) {
        const page = Number(interaction.customId.split(":")[2]);
        if (!Number.isInteger(page)) throw new Error("That removal selection is invalid.");
        const user = decodeRemovalUser(interaction.values[0]);
        await interaction.deferUpdate();
        await interaction.editReply(await removalConfirmation(user, page));
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (!interaction.customId.startsWith("users:")) return;

      if (interaction.customId === "users:add-modal") {
        const username = interaction.fields.getTextInputValue("username");
        const userId = interaction.fields.getTextInputValue("user_id");
        makeRobloxUser(username, userId);
        if (interaction.isFromMessage()) await interaction.deferUpdate();
        else await interaction.deferReply({ ephemeral: true });
        const profile = await resolveRobloxUser(username, userId);
        await interaction.editReply(profileConfirmation(profile));
      } else if (interaction.customId === "users:json-modal") {
        let parsed: unknown;
        try {
          parsed = JSON.parse(interaction.fields.getTextInputValue("json"));
        } catch {
          throw new Error("The submitted text is not valid JSON.");
        }
        const replacement = validateUserList(parsed);
        if (interaction.isFromMessage()) await interaction.deferUpdate();
        else await interaction.deferReply({ ephemeral: true });
        const list = await replaceRobloxUsers(replacement);
        await interaction.editReply(await dashboardMessage(list, "Complete JSON updated successfully."));
      }
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const response = {
      embeds: [statusEmbed("Unable to Update List", message.slice(0, 3900), true)],
      components: [homeButtonRow()]
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(response);
    } else if (interaction.isMessageComponent()) {
      await interaction.update(response);
    } else if (interaction.isModalSubmit() && interaction.isFromMessage()) {
      await interaction.update(response);
    } else {
      await interaction.reply({ ...response, ephemeral: true });
    }
  }
});

await client.login(config.DISCORD_TOKEN);
