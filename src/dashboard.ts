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
import {
  previewStoredRobloxUser,
  type RobloxProfile,
  type StoredRobloxProfile
} from "./roblox.js";

const colors = {
  normal: 0x5865f2,
  success: 0x57f287,
  error: 0xed4245
};

type StatusTone = "info" | "success" | "error";

export function statusEmbed(title: string, description: string, tone: StatusTone = "info") {
  return new EmbedBuilder()
    .setColor(colors[tone === "info" ? "normal" : tone])
    .setTitle(title)
    .setDescription(description);
}

export function loadingMessage(title: string) {
  return { embeds: [statusEmbed(title, "Loading...")], components: [] };
}

export function compactUserEmbed(profile: StoredRobloxProfile, position?: number) {
  const author = {
    name: `${position ? `${position}. ` : ""}${profile.username}  •  ID: ${profile.id}`,
    ...(profile.imageUrl ? { iconURL: profile.imageUrl } : {}),
    ...(profile.profileUrl ? { url: profile.profileUrl } : {})
  };
  return new EmbedBuilder()
    .setColor(profile.verified ? colors.normal : colors.error)
    .setAuthor(author);
}

export function homeButtonRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("users:home")
      .setLabel("Back to Users")
      .setStyle(ButtonStyle.Primary)
  );
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
  const embeds = profiles.map((profile, index) => compactUserEmbed(profile, start + index + 1));
  if (notice) embeds.forEach((embed) => embed.setFooter({ text: notice }));
  if (embeds.length === 0) {
    embeds.push(statusEmbed(
      "Roblox Users",
      notice ?? "No users.",
      notice ? "success" : "info"
    ));
  }

  const primary = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("users:add").setLabel("Add User").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("users:remove").setLabel("Remove User").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("users:json").setLabel("Edit JSON").setStyle(ButtonStyle.Secondary),
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
      .setLabel(`Page ${page + 1} / ${pageCount}`)
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
  const embed = compactUserEmbed({
    id: profile.id,
    username: profile.username,
    profileUrl: profile.profileUrl,
    imageUrl: profile.imageUrl,
    verified: true
  })
    .setTitle("Add User");

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
    .setTitle("Add User")
    .addComponents(
      input("username", "Roblox username (optional)", false, "builderman"),
      input("user_id", "Roblox user ID (optional)", false, "156")
    );
}

export function fullJsonModal(list: RobloxUserList) {
  const json = JSON.stringify(list, null, 2);
  if (json.length > 4000) {
    throw new Error("JSON too large.");
  }
  const jsonInput = new TextInputBuilder()
    .setCustomId("json")
    .setLabel("JSON")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000)
    .setValue(json);
  return new ModalBuilder()
    .setCustomId("users:json-modal")
    .setTitle("Edit JSON")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(jsonInput));
}
