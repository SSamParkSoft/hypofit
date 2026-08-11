import { apiRequest, type ApiRequestInit } from "./client";
import type { ChatMessage, ChatRoom } from "./types";

export interface SendChatMessageInput {
  body: string;
  client_message_id?: string | null;
}

export interface MarkChatRoomReadInput {
  last_read_message_id?: string | null;
}

export interface UpdateChatRoomSettingsInput {
  is_muted?: boolean | null;
  is_hidden?: boolean | null;
}

const chatCollectionPath = "/api/v1/chat/rooms/";

export const chatRoutes = {
  rooms: chatCollectionPath,
  room: (roomId: string) => `${chatCollectionPath}${encodeURIComponent(roomId)}`,
  messages: (roomId: string) =>
    `${chatCollectionPath}${encodeURIComponent(roomId)}/messages`,
  read: (roomId: string) => `${chatCollectionPath}${encodeURIComponent(roomId)}/read`,
  settings: (roomId: string) => `${chatCollectionPath}${encodeURIComponent(roomId)}/settings`,
} as const;

export function listChatRooms(
  accessToken?: string | null,
  init?: ApiRequestInit,
): Promise<ChatRoom[]> {
  return apiRequest<ChatRoom[]>(chatRoutes.rooms, { ...init, accessToken });
}

export function getChatRoom(
  roomId: string,
  accessToken?: string | null,
  init?: ApiRequestInit,
): Promise<ChatRoom> {
  return apiRequest<ChatRoom>(chatRoutes.room(roomId), { ...init, accessToken });
}

export function listChatMessages(
  roomId: string,
  accessToken?: string | null,
  init?: ApiRequestInit,
): Promise<ChatMessage[]> {
  return apiRequest<ChatMessage[]>(chatRoutes.messages(roomId), { ...init, accessToken });
}

export function sendChatMessage(
  roomId: string,
  input: SendChatMessageInput,
  accessToken?: string | null,
): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(chatRoutes.messages(roomId), {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function markChatRoomRead(
  roomId: string,
  accessToken?: string | null,
  input?: MarkChatRoomReadInput,
): Promise<unknown> {
  return apiRequest<unknown>(chatRoutes.read(roomId), {
    method: "POST",
    accessToken,
    body: input ? JSON.stringify(input) : undefined,
  });
}

export function updateChatRoomSettings(
  roomId: string,
  input: UpdateChatRoomSettingsInput,
  accessToken?: string | null,
): Promise<unknown> {
  return apiRequest<unknown>(chatRoutes.settings(roomId), {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
}

export const chatApi = {
  listRooms: listChatRooms,
  getRoom: getChatRoom,
  listMessages: listChatMessages,
  markRead: markChatRoomRead,
  sendMessage: sendChatMessage,
  updateSettings: updateChatRoomSettings,
} as const;
