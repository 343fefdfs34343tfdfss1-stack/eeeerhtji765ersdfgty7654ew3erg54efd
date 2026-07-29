import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("users")
    .setDescription("Open the embedded Roblox user manager")
].map((command) => command.toJSON());
