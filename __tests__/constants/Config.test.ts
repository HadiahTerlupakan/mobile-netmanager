describe('Config API_URL', () => {
  const loadConfig = () => {
    let Config: typeof import('@/constants/Config').Config

    jest.isolateModules(() => {
      ;({ Config } = require('@/constants/Config'))
    })

    return Config!
  }

  const mockExpoRuntime = ({
    executionEnvironment = 'standalone',
    isRunningInExpoGo = false,
  }: {
    executionEnvironment?: 'storeClient' | 'standalone' | 'bare'
    isRunningInExpoGo?: boolean
  } = {}) => {
    jest.doMock('expo', () => ({
      isRunningInExpoGo: () => isRunningInExpoGo,
    }))

    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          hostUri: '192.168.18.86:8081',
        },
        executionEnvironment,
      },
    }))
  }

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

    mockExpoRuntime()
  })

  afterEach(() => {
    jest.dontMock('expo')
    jest.dontMock('expo-constants')
    jest.dontMock('react-native')
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

  it('disables app update checks for development Android builds', () => {
    process.env.EXPO_PUBLIC_APP_VARIANT = 'development'
    mockPlatform('android')
    mockExpoRuntime({ executionEnvironment: 'standalone' })

    const Config = loadConfig()

    expect(Config.CAN_AUTO_CHECK_APP_UPDATES).toBe(false)
    expect(Config.CAN_MANUALLY_CHECK_APP_UPDATES).toBe(false)
  })

  it('enables app update checks for Android staging builds outside Expo Go', () => {
    process.env.EXPO_PUBLIC_APP_VARIANT = 'staging'
    mockPlatform('android')
    mockExpoRuntime({ executionEnvironment: 'standalone' })

    const Config = loadConfig()

    expect(Config.CAN_AUTO_CHECK_APP_UPDATES).toBe(true)
    expect(Config.CAN_MANUALLY_CHECK_APP_UPDATES).toBe(true)
  })

  it('disables app update checks inside Expo Go even for non-development variants', () => {
    process.env.EXPO_PUBLIC_APP_VARIANT = 'staging'
    mockPlatform('android')
    mockExpoRuntime({ executionEnvironment: 'storeClient', isRunningInExpoGo: true })

    const Config = loadConfig()

    expect(Config.CAN_AUTO_CHECK_APP_UPDATES).toBe(false)
    expect(Config.CAN_MANUALLY_CHECK_APP_UPDATES).toBe(false)
  })

  // Sejak a8a4eb3, production Android (standalone, di luar Expo Go) DIIZINKAN
  // cek update (OTA + APK Play Store). Test lama mengharap disable → sudah basi.
  it('enables app update checks for Android production builds', () => {
    process.env.EXPO_PUBLIC_APP_VARIANT = 'production'
    mockPlatform('android')
    mockExpoRuntime({ executionEnvironment: 'standalone' })

    const Config = loadConfig()

    expect(Config.CAN_AUTO_CHECK_APP_UPDATES).toBe(true)
    expect(Config.CAN_MANUALLY_CHECK_APP_UPDATES).toBe(true)
  })
})
