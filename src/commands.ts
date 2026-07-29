import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("users")
    .setDescription("Manage users")
].map((command) => command.toJSON());
