import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("track")
    .setDescription("Add a Discord username or user ID to the GitHub tracking file")
    .addStringOption((option) =>
      option
        .setName("target")
        .setDescription("Discord username, user ID, or mention")
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(32)
    )
].map((command) => command.toJSON());
