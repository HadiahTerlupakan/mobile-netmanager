export const CHAT_JOIN_ROOM_EVENT = 'join:room'
export const CHAT_LEAVE_ROOM_EVENT = 'leave:room'

export function getChatRoomName(conversationId: string): string {
  return `chat:${conversationId}`
}
