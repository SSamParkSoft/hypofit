import type { ChatMessage, ChatRoom, ChatWorkflow } from "@hypofit/contracts";
import { apiRequest } from "./client";

export interface SendChatMessageInput {
  body: string;
  client_message_id?: string | null;
}

export interface MarkChatRoomReadInput {
  last_read_message_id?: string | null;
}

export interface UpdateChatRoomSettingsInput {
  is_hidden?: boolean | null;
  is_muted?: boolean | null;
}

export interface ChatRoomSettings {
  room_id: string;
  user_id: string;
  is_hidden: boolean;
  is_muted: boolean;
  last_read_at: string | null;
}

const chatRoomsPath = "/api/v1/chat/rooms/";

export const chatRoutes = {
  rooms: chatRoomsPath,
  room: (roomId: string) => `${chatRoomsPath}${encodeURIComponent(roomId)}`,
  messages: (roomId: string) => `${chatRoomsPath}${encodeURIComponent(roomId)}/messages`,
  read: (roomId: string) => `${chatRoomsPath}${encodeURIComponent(roomId)}/read`,
  settings: (roomId: string) => `${chatRoomsPath}${encodeURIComponent(roomId)}/settings`,
  workflow: (roomId: string) => `${chatRoomsPath}${encodeURIComponent(roomId)}/workflow`,
} as const;

export const chatApi = {
  listRooms(accessToken?: string | null) {
    return apiRequest<ChatRoom[]>(chatRoutes.rooms, { accessToken });
  },
  getRoom(roomId: string, accessToken?: string | null) {
    return apiRequest<ChatRoom>(chatRoutes.room(roomId), { accessToken });
  },
  getWorkflow(roomId: string, accessToken?: string | null) {
    return apiRequest<ChatWorkflow>(chatRoutes.workflow(roomId), { accessToken });
  },
  listMessages(roomId: string, accessToken?: string | null) {
    return apiRequest<ChatMessage[]>(chatRoutes.messages(roomId), { accessToken });
  },
  sendMessage(roomId: string, input: SendChatMessageInput, accessToken?: string | null) {
    return apiRequest<ChatMessage>(chatRoutes.messages(roomId), {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    });
  },
  markRead(roomId: string, accessToken?: string | null, input?: MarkChatRoomReadInput) {
    return apiRequest<ChatRoomSettings>(chatRoutes.read(roomId), {
      method: "POST",
      accessToken,
      body: input ? JSON.stringify(input) : undefined,
    });
  },
  updateSettings(roomId: string, input: UpdateChatRoomSettingsInput, accessToken?: string | null) {
    return apiRequest<ChatRoomSettings>(chatRoutes.settings(roomId), {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(input),
    });
  },
} as const;
