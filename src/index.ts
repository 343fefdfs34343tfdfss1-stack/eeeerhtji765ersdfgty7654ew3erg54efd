import {
  Client,
  Events,
  GatewayIntentBits,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits
} from "discord.js";
import { config } from "./config.js";
import {
  addRobloxUser,
  getRobloxUsers,
  getRobloxUsersSnapshot,
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
  loadingMessage,
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

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Try again.";
  const message = error.message.trim();
  if (
    !message ||
    message.length > 120 ||
    message.includes("\n") ||
    /DiscordAPIError|HttpError|Invalid Form Body|GitHub/i.test(message)
  ) return "Try again.";
  return message;
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.inCachedGuild() || !interaction.isRepliable()) return;

  try {
    if (!isAllowed(interaction.member)) {
      await interaction.reply({
        embeds: [statusEmbed("Error", "No permission.", "error")],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "users") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply(await dashboardMessage(await getRobloxUsers()));
        return;
      }

      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === "users:home") {
        await interaction.deferUpdate();
        await interaction.editReply(loadingMessage("Users"));
        await interaction.editReply(await dashboardMessage(await getRobloxUsers()));
      } else if (interaction.customId.startsWith("remove:list:")) {
        const page = Number(interaction.customId.split(":")[2]);
        if (!Number.isInteger(page)) throw new Error("Invalid page.");
        await interaction.deferUpdate();
        await interaction.editReply(await removalListMessage(await getRobloxUsers(), page));
      } else if (interaction.customId.startsWith("remove:cancel:")) {
        const page = Number(interaction.customId.split(":")[2]);
        if (!Number.isInteger(page)) throw new Error("Invalid page.");
        await interaction.deferUpdate();
        await interaction.editReply(await removalListMessage(await getRobloxUsers(), page));
      } else if (interaction.customId.startsWith("remove:confirm:")) {
        const [, , pageValue, identity] = interaction.customId.split(":");
        const page = Number(pageValue);
        if (!Number.isInteger(page) || !identity) throw new Error("Invalid selection.");
        const user = decodeRemovalUser(identity);
        await interaction.deferUpdate();
        await interaction.editReply(loadingMessage("Remove User"));
        const list = await removeExactRobloxUser(user);
        await interaction.editReply(await dashboardMessage(list, "User removed."));
      } else if (interaction.customId.startsWith("users:confirm-add:")) {
        const [, , userId, username] = interaction.customId.split(":");
        if (!userId || !username) throw new Error("Invalid user.");
        await interaction.deferUpdate();
        await interaction.editReply(loadingMessage("Add User"));
        const result = await addRobloxUser(makeRobloxUser(username, userId));
        await interaction.editReply(await dashboardMessage(
          result.list,
          result.added ? "User added." : "User exists."
        ));
      } else if (interaction.customId === "users:cancel-add") {
        await interaction.deferUpdate();
        await interaction.editReply(await dashboardMessage(await getRobloxUsers(), "Cancelled."));
      } else if (interaction.customId === "users:add") {
        await interaction.showModal(addUserModal());
      } else if (interaction.customId === "users:remove") {
        await interaction.deferUpdate();
        await interaction.editReply(loadingMessage("Remove User"));
        await interaction.editReply(await removalListMessage(await getRobloxUsers()));
      } else if (interaction.customId === "users:json") {
        const snapshot = await getRobloxUsersSnapshot();
        await interaction.showModal(fullJsonModal(snapshot.list, snapshot.sha));
      } else if (interaction.customId.startsWith("users:page:")) {
        const page = Number(interaction.customId.split(":")[2]);
        if (!Number.isInteger(page)) throw new Error("Invalid page.");
        await interaction.deferUpdate();
        await interaction.editReply(await dashboardMessage(await getRobloxUsers(), undefined, page));
      } else if (interaction.customId.startsWith("users:refresh:")) {
        const page = Number(interaction.customId.split(":")[2]);
        if (!Number.isInteger(page)) throw new Error("Invalid page.");
        await interaction.deferUpdate();
        await interaction.editReply(await dashboardMessage(await getRobloxUsers(), "Refreshed.", page));
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("remove:select:")) {
        const page = Number(interaction.customId.split(":")[2]);
        if (!Number.isInteger(page)) throw new Error("Invalid selection.");
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
        else await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply(loadingMessage("Add User"));
        const profile = await resolveRobloxUser(username, userId);
        await interaction.editReply(profileConfirmation(profile));
      } else if (interaction.customId.startsWith("users:json-modal:")) {
        const revision = interaction.customId.split(":")[2];
        if (!revision || !/^[0-9a-f]{40}$/i.test(revision)) {
          throw new Error("Invalid JSON version.");
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(interaction.fields.getTextInputValue("json"));
        } catch {
          throw new Error("Invalid JSON.");
        }
        const replacement = validateUserList(parsed);
        if (interaction.isFromMessage()) await interaction.deferUpdate();
        else await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply(loadingMessage("Edit JSON"));
        const list = await replaceRobloxUsers(replacement, revision);
        await interaction.editReply(await dashboardMessage(list, "JSON updated."));
      }
    }
  } catch (error) {
    console.error(error);
    const message = errorMessage(error);
    const response = {
      embeds: [statusEmbed("Error", message.slice(0, 3900), "error")],
      components: [homeButtonRow()]
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(response);
    } else if (interaction.isMessageComponent()) {
      await interaction.update(response);
    } else if (interaction.isModalSubmit() && interaction.isFromMessage()) {
      await interaction.update(response);
    } else {
      await interaction.reply({ ...response, flags: MessageFlags.Ephemeral });
    }
  }
});

await client.login(config.DISCORD_TOKEN);
