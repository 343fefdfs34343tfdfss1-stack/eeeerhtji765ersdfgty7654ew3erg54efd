import {
  Client,
  Events,
  GatewayIntentBits,
  GuildMember,
  PermissionFlagsBits
} from "discord.js";
import { config } from "./config.js";
import { setTrackedTarget } from "./github.js";
import { normalizeTarget } from "./target.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function isAllowed(member: GuildMember) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles.cache.some((role) => config.allowedRoleIds.has(role.id));
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;

  try {
    if (!isAllowed(interaction.member)) {
      await interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName !== "track") return;

    const target = normalizeTarget(interaction.options.getString("target", true));
    await interaction.reply({ content: "Setting Target", ephemeral: true });

    await setTrackedTarget(target);
    await interaction.editReply("Target Set");
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const response = `❌ ${message.slice(0, 1500)}`;
    if (interaction.replied || interaction.deferred) await interaction.editReply(response);
    else await interaction.reply({ content: response, ephemeral: true });
  }
});

await client.login(config.DISCORD_TOKEN);
