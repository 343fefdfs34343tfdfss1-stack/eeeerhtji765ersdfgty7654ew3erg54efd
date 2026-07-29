import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import type { RobloxUserList } from "./github.js";
import type { RobloxProfile } from "./roblox.js";

const colors = {
  normal: 0x5865f2,
  success: 0x57f287,
  error: 0xed4245
};

export function statusEmbed(title: string, description: string, error = false) {
  return new EmbedBuilder()
    .setColor(error ? colors.error : colors.success)
    .setTitle(title)
    .setDescription(description);
}

export function dashboardMessage(list: RobloxUserList, notice?: string) {
  const lines = list.roblox_users.map((user, index) => {
    const username = user.roblox_username ? `Username: \`${user.roblox_username}\`` : "";
    const userId = user.roblox_user_id ? `ID: \`${user.roblox_user_id}\`` : "";
    return `**${index + 1}.** ${[username, userId].filter(Boolean).join("  •  ")}`;
  });

  let description = lines.length ? lines.join("\n") : "*No Roblox users have been added yet.*";
  if (description.length > 3800) {
    description = `${description.slice(0, 3750)}\n\n*List shortened in this view. Use Edit Full JSON to access the complete file.*`;
  }

  const embed = new EmbedBuilder()
    .setColor(colors.normal)
    .setTitle("Roblox User List")
    .setDescription(description)
    .addFields({ name: "Entries", value: String(list.roblox_users.length), inline: true })
    .setFooter({ text: "Use the buttons below to manage the GitHub JSON file." });
  if (notice) embed.addFields({ name: "Status", value: notice });

  const primary = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("users:add").setLabel("Add User").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("users:edit").setLabel("Edit User").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("users:remove").setLabel("Remove User").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("users:json").setLabel("Edit Full JSON").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("users:refresh").setLabel("Refresh").setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [primary] };
}

export function profileConfirmation(profile: RobloxProfile) {
  const embed = new EmbedBuilder()
    .setColor(colors.normal)
    .setTitle("Verify Roblox User")
    .setURL(profile.profileUrl)
    .setDescription(`[Open this profile on Roblox](${profile.profileUrl}) before adding it.`)
    .addFields(
      { name: "Username", value: profile.username, inline: true },
      { name: "Display Name", value: profile.displayName, inline: true },
      { name: "User ID", value: profile.id, inline: true }
    )
    .setFooter({ text: "The user is not added until you press Confirm Add." });

  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`users:confirm-add:${profile.id}:${profile.username}`)
      .setLabel("Confirm Add")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setLabel("Open Roblox Profile")
      .setStyle(ButtonStyle.Link)
      .setURL(profile.profileUrl),
    new ButtonBuilder()
      .setCustomId("users:cancel-add")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [actions] };
}

function input(
  id: string,
  label: string,
  required: boolean,
  placeholder?: string,
  style = TextInputStyle.Short
) {
  const field = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required);
  if (placeholder) field.setPlaceholder(placeholder);
  return new ActionRowBuilder<TextInputBuilder>().addComponents(field);
}

export function addUserModal() {
  return new ModalBuilder()
    .setCustomId("users:add-modal")
    .setTitle("Add Roblox User")
    .addComponents(
      input("username", "Username (optional)", false, "chrisone"),
      input("user_id", "User ID (optional)", false, "302098")
    );
}

export function editUserModal() {
  return new ModalBuilder()
    .setCustomId("users:edit-modal")
    .setTitle("Edit Roblox User")
    .addComponents(
      input("entry", "Entry number", true, "1"),
      input("username", "New username (optional)", false, "Leave blank to omit"),
      input("user_id", "New user ID (optional)", false, "Leave blank to omit")
    );
}

export function removeUserModal() {
  return new ModalBuilder()
    .setCustomId("users:remove-modal")
    .setTitle("Remove Roblox User")
    .addComponents(input("entry", "Entry number to remove", true, "1"));
}

export function fullJsonModal(list: RobloxUserList) {
  const json = JSON.stringify(list, null, 2);
  if (json.length > 4000) {
    throw new Error("The JSON is too large for Discord's 4,000-character form limit.");
  }
  const jsonInput = new TextInputBuilder()
    .setCustomId("json")
    .setLabel("Complete JSON")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000)
    .setValue(json);
  return new ModalBuilder()
    .setCustomId("users:json-modal")
    .setTitle("Edit Full Roblox User JSON")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(jsonInput));
}
