// Modul native: tidak bisa dimuat di Jest.
module.exports = {
  startActivityAsync: jest.fn(async () => ({ resultCode: 0 })),
  ActivityAction: {
    LOCATION_SOURCE_SETTINGS: 'android.settings.LOCATION_SOURCE_SETTINGS',
    VIEW: 'android.intent.action.VIEW',
  },
};
