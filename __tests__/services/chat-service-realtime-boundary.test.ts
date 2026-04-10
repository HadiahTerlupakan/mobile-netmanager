import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../src/services/UploadService', () => ({
  uploadService: {
    uploadCustom: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

import { chatService } from '../../src/services/ChatService';

describe('mobile chat service realtime boundary', () => {
  it('does not expose legacy realtime socket lifecycle helpers', () => {
    expect('connectSocket' in chatService).toBe(false);
    expect('disconnect' in chatService).toBe(false);
    expect('joinConversation' in chatService).toBe(false);
    expect('leaveConversation' in chatService).toBe(false);
    expect('onNewMessage' in chatService).toBe(false);
    expect('onTyping' in chatService).toBe(false);
    expect('onStopTyping' in chatService).toBe(false);
    expect('offNewMessage' in chatService).toBe(false);
    expect('sendTyping' in chatService).toBe(false);
    expect('sendStopTyping' in chatService).toBe(false);
  });
});
