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
  editRobloxUser,
  getRobloxUsers,
  removeRobloxUser,
  replaceRobloxUsers,
  validateUserList
} from "./github.js";
import { makeRobloxUser } from "./target.js";
import {
  addUserModal,
  dashboardMessage,
  editUserModal,
  fullJsonModal,
  removeUserModal,
  statusEmbed
} from "./dashboard.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function isAllowed(member: GuildMember) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles.cache.some((role) => config.allowedRoleIds.has(role.id));
}

function entryIndex(value: string) {
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) throw new Error("Enter a valid entry number from the list.");
  return Number(trimmed) - 1;
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
        await interaction.editReply(dashboardMessage(await getRobloxUsers()));
        return;
      }

      if (interaction.commandName === "add" && interaction.options.getSubcommand() === "user") {
        const user = makeRobloxUser(
          interaction.options.getString("username"),
          interaction.options.getString("user_id")
        );
        await interaction.reply({
          embeds: [statusEmbed("Adding User", "Updating the GitHub JSON list…")],
          ephemeral: true
        });
        const list = await addRobloxUser(user);
        await interaction.editReply(dashboardMessage(list, "User added successfully."));
      }
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === "users:add") {
        await interaction.showModal(addUserModal());
      } else if (interaction.customId === "users:edit") {
        await interaction.showModal(editUserModal());
      } else if (interaction.customId === "users:remove") {
        await interaction.showModal(removeUserModal());
      } else if (interaction.customId === "users:json") {
        await interaction.showModal(fullJsonModal(await getRobloxUsers()));
      } else if (interaction.customId === "users:refresh") {
        await interaction.deferUpdate();
        await interaction.editReply(dashboardMessage(await getRobloxUsers(), "List refreshed."));
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (!interaction.customId.startsWith("users:")) return;

      if (interaction.customId === "users:add-modal") {
        const user = makeRobloxUser(
          interaction.fields.getTextInputValue("username"),
          interaction.fields.getTextInputValue("user_id")
        );
        await interaction.deferReply({ ephemeral: true });
        const list = await addRobloxUser(user);
        await interaction.editReply(dashboardMessage(list, "User added successfully."));
      } else if (interaction.customId === "users:edit-modal") {
        const index = entryIndex(interaction.fields.getTextInputValue("entry"));
        const user = makeRobloxUser(
          interaction.fields.getTextInputValue("username"),
          interaction.fields.getTextInputValue("user_id")
        );
        await interaction.deferReply({ ephemeral: true });
        const list = await editRobloxUser(index, user);
        await interaction.editReply(dashboardMessage(list, `Entry ${index + 1} updated successfully.`));
      } else if (interaction.customId === "users:remove-modal") {
        const index = entryIndex(interaction.fields.getTextInputValue("entry"));
        await interaction.deferReply({ ephemeral: true });
        const list = await removeRobloxUser(index);
        await interaction.editReply(dashboardMessage(list, `Entry ${index + 1} removed successfully.`));
      } else if (interaction.customId === "users:json-modal") {
        let parsed: unknown;
        try {
          parsed = JSON.parse(interaction.fields.getTextInputValue("json"));
        } catch {
          throw new Error("The submitted text is not valid JSON.");
        }
        const replacement = validateUserList(parsed);
        await interaction.deferReply({ ephemeral: true });
        const list = await replaceRobloxUsers(replacement);
        await interaction.editReply(dashboardMessage(list, "Complete JSON updated successfully."));
      }
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const response = { embeds: [statusEmbed("Unable to Update List", message.slice(0, 3900), true)], components: [] };
    if (interaction.replied || interaction.deferred) await interaction.editReply(response);
    else await interaction.reply({ ...response, ephemeral: true });
  }
});

await client.login(config.DISCORD_TOKEN);
