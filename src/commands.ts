import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add an entry to the Roblox user list")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("Add a Roblox user by username, user ID, or both")
        .addStringOption((option) =>
          option
            .setName("username")
            .setDescription("Roblox username")
            .setRequired(false)
            .setMinLength(3)
            .setMaxLength(20)
        )
        .addStringOption((option) =>
          option
            .setName("user_id")
            .setDescription("Roblox numeric user ID")
            .setRequired(false)
            .setMinLength(1)
            .setMaxLength(20)
        )
    ),
  new SlashCommandBuilder()
    .setName("users")
    .setDescription("Open the embedded Roblox user-list editor")
].map((command) => command.toJSON());
