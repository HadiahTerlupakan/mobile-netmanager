const notifee = {
  createChannel: jest.fn(() => Promise.resolve('high-priority')),
  displayNotification: jest.fn(() => Promise.resolve('notification-id')),
  onForegroundEvent: jest.fn(() => jest.fn()),
  onBackgroundEvent: jest.fn(),
  cancelNotification: jest.fn(() => Promise.resolve()),
  cancelAllNotifications: jest.fn(() => Promise.resolve()),
  requestPermission: jest.fn(() =>
    Promise.resolve({ authorizationStatus: 1 })
  ),
};

module.exports = {
  __esModule: true,
  default: notifee,
  AndroidImportance: {
    NONE: 0,
    MIN: 1,
    LOW: 2,
    DEFAULT: 3,
    HIGH: 4,
  },
  EventType: {
    DISMISSED: 0,
    PRESS: 1,
    ACTION_PRESS: 2,
    DELIVERED: 3,
    APP_BLOCKED: 4,
    CHANNEL_BLOCKED: 5,
    CHANNEL_GROUP_BLOCKED: 6,
    TRIGGER_NOTIFICATION_CREATED: 7,
  },
};
