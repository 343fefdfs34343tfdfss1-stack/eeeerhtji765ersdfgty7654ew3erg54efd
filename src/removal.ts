import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from "discord.js";
import type { RobloxUser, RobloxUserList } from "./github.js";
import { validateUserList } from "./github.js";
import { previewStoredRobloxUser } from "./roblox.js";
import { compactUserEmbed, homeButtonRow, statusEmbed } from "./dashboard.js";

const PAGE_SIZE = 10;

function encodeUser(user: RobloxUser) {
  return Buffer.from(`${user.roblox_user_id ?? ""}\n${user.roblox_username ?? ""}`, "utf8").toString("base64url");
}

export function decodeRemovalUser(value: string) {
  const indexedValue = value.match(/^\d+:(.+)$/);
  if (indexedValue) value = indexedValue[1];
  let decoded: string;
  try {
    decoded = Buffer.from(value, "base64url").toString("utf8");
  } catch {
    throw new Error("Invalid selection.");
  }
  const separator = decoded.indexOf("\n");
  if (separator === -1) throw new Error("Invalid selection.");
  const userId = decoded.slice(0, separator) || undefined;
  const username = decoded.slice(separator + 1) || undefined;
  return validateUserList({
    roblox_users: [{
      ...(userId ? { roblox_user_id: userId } : {}),
      ...(username ? { roblox_username: username } : {})
    }]
  }).roblox_users[0];
}

export async function removalListMessage(list: RobloxUserList, requestedPage = 0, notice?: string) {
  if (list.roblox_users.length === 0) {
    return {
      embeds: [statusEmbed("Remove User", notice ?? "No users.")],
      components: [homeButtonRow()]
    };
  }

  const pageCount = Math.ceil(list.roblox_users.length / PAGE_SIZE);
  const page = Math.max(0, Math.min(requestedPage, pageCount - 1));
  const start = page * PAGE_SIZE;
  const users = list.roblox_users.slice(start, start + PAGE_SIZE);
  const profiles = await Promise.all(users.map((user) =>
    previewStoredRobloxUser(user.roblox_username, user.roblox_user_id)
  ));
  const embeds = profiles.map((profile, index) => compactUserEmbed(profile, start + index + 1));
  if (notice) embeds.forEach((embed) => embed.setFooter({ text: notice }));

  const selector = new StringSelectMenuBuilder()
    .setCustomId(`remove:select:${page}`)
    .setPlaceholder(`Select user • Page ${page + 1} / ${pageCount}`)
    .addOptions(users.map((user, index) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(profiles[index].username ?? `User ${start + index + 1}`)
        .setDescription(`ID: ${profiles[index].id}`)
        .setValue(`${start + index}:${encodeUser(user)}`)
    ));
  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selector);
  const navigation = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`remove:list:${page - 1}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`remove:page:${page}`)
      .setLabel(`Page ${page + 1} / ${pageCount}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`remove:list:${page + 1}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === pageCount - 1),
    new ButtonBuilder()
      .setCustomId(`remove:list:${page}`)
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("users:home")
      .setLabel("Back to Users")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds, components: [selectRow, navigation] };
}

export async function removalConfirmation(user: RobloxUser, page: number) {
  const profile = await previewStoredRobloxUser(user.roblox_username, user.roblox_user_id);
  const embed = compactUserEmbed(profile)
    .setTitle("Remove User");
  const identity = encodeUser(user);
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`remove:confirm:${page}:${identity}`)
      .setLabel("Remove")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`remove:cancel:${page}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("users:home")
      .setLabel("Back to Users")
      .setStyle(ButtonStyle.Primary)
  );
  return { embeds: [embed], components: [actions] };
}
