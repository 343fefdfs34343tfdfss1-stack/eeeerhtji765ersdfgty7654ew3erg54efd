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
import { previewStoredRobloxUser, type RobloxProfile } from "./roblox.js";

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

export async function dashboardMessage(list: RobloxUserList, notice?: string, requestedPage = 0) {
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(list.roblox_users.length / pageSize));
  const page = Math.max(0, Math.min(requestedPage, pageCount - 1));
  const start = page * pageSize;
  const users = list.roblox_users.slice(start, start + pageSize);
  const profiles = await Promise.all(users.map((user) =>
    previewStoredRobloxUser(user.roblox_username, user.roblox_user_id)
  ));
  const embeds = profiles.map((profile, index) => {
    const author = {
      name: `${start + index + 1}. ${profile.username}  •  User ID: ${profile.id}`,
      ...(profile.imageUrl ? { iconURL: profile.imageUrl } : {}),
      ...(profile.profileUrl ? { url: profile.profileUrl } : {})
    };
    return new EmbedBuilder()
      .setColor(profile.verified ? colors.normal : colors.error)
      .setAuthor(author);
  });
  if (embeds.length === 0) {
    embeds.push(statusEmbed("Roblox User List", notice ?? "No Roblox users have been added yet."));
  }

  const primary = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("users:add").setLabel("Add User").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("users:remove").setLabel("Remove User").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("users:json").setLabel("Edit Full JSON").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`users:refresh:${page}`).setLabel("Refresh").setStyle(ButtonStyle.Secondary)
  );
  const navigation = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`users:page:${page - 1}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`users:page:${page}`)
      .setLabel(`${notice ? `${notice} • ` : ""}Page ${page + 1}/${pageCount}`.slice(0, 80))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`users:page:${page + 1}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === pageCount - 1)
  );

  return { embeds, components: [primary, navigation] };
}

export function profileConfirmation(profile: RobloxProfile) {
  const embed = new EmbedBuilder()
    .setColor(colors.normal)
    .setTitle("Verify Roblox User")
    .setURL(profile.profileUrl)
    .setThumbnail(profile.imageUrl)
    .addFields(
      { name: "Username", value: profile.username, inline: true },
      { name: "Display Name", value: profile.displayName, inline: true },
      { name: "User ID", value: profile.id, inline: true }
    );

  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`users:confirm-add:${profile.id}:${profile.username}`)
      .setLabel("Add")
      .setStyle(ButtonStyle.Success),
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
