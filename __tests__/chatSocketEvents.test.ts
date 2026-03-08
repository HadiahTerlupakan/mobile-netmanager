import { CHAT_JOIN_ROOM_EVENT, CHAT_LEAVE_ROOM_EVENT, getChatRoomName } from '../src/services/chatSocketEvents'

describe('chat socket events', () => {
  it('matches server room event names', () => {
    expect(CHAT_JOIN_ROOM_EVENT).toBe('join:room')
    expect(CHAT_LEAVE_ROOM_EVENT).toBe('leave:room')
  })

  it('builds the expected chat room name', () => {
    expect(getChatRoomName('conv-1')).toBe('chat:conv-1')
  })
})
