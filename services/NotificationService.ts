import * as Notifications from 'expo-notifications';

// Configure notification handler to show alerts when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export const NotificationService = {
  requestPermissions: async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      return newStatus === 'granted';
    }
    return true;
  },

  showLocalNotification: async (title: string, body: string) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true, // Default sound
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.warn('[NotificationService] Failed to show notification:', error);
    }
  }
};
