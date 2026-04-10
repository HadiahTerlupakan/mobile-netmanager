describe('Config API_URL', () => {
  const originalEnv = process.env

  const mockPlatform = (os: 'android' | 'ios') => {
    jest.doMock('react-native', () => ({
      Platform: {
        OS: os,
      },
    }))
  }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.EXPO_PUBLIC_API_URL
    delete process.env.EXPO_PUBLIC_APP_VARIANT

    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          hostUri: '192.168.18.86:8081',
        },
      },
    }))
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('prefers EXPO_PUBLIC_API_URL over Expo hostUri in development', () => {
    process.env.EXPO_PUBLIC_APP_VARIANT = 'development'
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000'
    mockPlatform('android')

    const { Config } = require('@/constants/Config')

    expect(Config.API_URL).toBe('http://10.0.2.2:3000')
  })

  it('falls back to Android emulator host when no explicit API URL is set', () => {
    process.env.EXPO_PUBLIC_APP_VARIANT = 'development'
    mockPlatform('android')

    const { Config } = require('@/constants/Config')

    expect(Config.API_URL).toBe('http://10.0.2.2:3000')
  })

  it('falls back to localhost on iOS when no explicit API URL is set', () => {
    process.env.EXPO_PUBLIC_APP_VARIANT = 'development'
    mockPlatform('ios')

    const { Config } = require('@/constants/Config')

    expect(Config.API_URL).toBe('http://localhost:3000')
  })
})
