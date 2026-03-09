const mockError = jest.fn()
const mockWarn = jest.fn()
const mockInfo = jest.fn()
const mockDebug = jest.fn()

jest.mock('@/utils/logger', () => ({
  logger: {
    error: mockError,
    warn: mockWarn,
    info: mockInfo,
    debug: mockDebug,
  },
}))

const mockGetTenantUrl = jest.fn(() => 'https://tenant.example.com')
jest.mock('@/services/TenantService', () => ({
  TenantService: {
    getTenantUrl: mockGetTenantUrl,
  },
}))

const mockGetToken = jest.fn(() => 'token-123')
jest.mock('@/services/TokenService', () => ({
  TokenService: {
    getToken: mockGetToken,
    setToken: jest.fn(),
  },
}))

jest.mock('@/constants/appVersion', () => ({
  CURRENT_VERSION_CODE: 42,
  CURRENT_VERSION_NAME: '1.2.3',
}))

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    Version: 34,
  },
}))

describe('ErrorReportingService', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock
  })

  const loadService = (enabled = true) => {
    jest.doMock('@/constants/Config', () => ({
      Config: {
        ENABLE_BACKEND_ERROR_REPORTING: enabled,
      },
    }))

    let service: typeof import('@/services/ErrorReportingService').errorReportingService

    jest.isolateModules(() => {
      ({ errorReportingService: service } = require('@/services/ErrorReportingService'))
    })

    return service!
  }

  it('sends backend error reports with app and user context when enabled', async () => {
    const service = loadService(true)

    service.init()
    service.setUser({ id: 'user-1', email: 'user@example.com' })
    service.setTag('tenant', 'tenant-a')
    service.setContext('query', { queryKey: ['tickets'] })
    service.addBreadcrumb('navigation', 'Opened tickets screen')

    service.captureException(new Error('Network request failed'), {
      source: 'query',
      screen: 'CustomerTicketsScreen',
      route: '/(customer)/tickets',
    })

    await new Promise((resolve) => setImmediate(resolve))

    expect(global.fetch).toHaveBeenCalledWith(
      'https://tenant.example.com/api/mobile/error-report',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        }),
        body: expect.stringContaining('Network request failed'),
      })
    )

    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(requestBody).toEqual(
      expect.objectContaining({
        message: 'Network request failed',
        kind: 'exception',
        source: 'query',
        screen: 'CustomerTicketsScreen',
        route: '/(customer)/tickets',
        appVersion: '1.2.3+42',
        platform: 'android',
        breadcrumbs: expect.any(Array),
        context: expect.objectContaining({
          user: expect.objectContaining({ id: 'user-1' }),
          tags: expect.objectContaining({ tenant: 'tenant-a' }),
        }),
      })
    )
  })

  it('does not send backend reports when backend transport is disabled', async () => {
    const service = loadService(false)

    service.init()
    service.captureException(new Error('Should stay local'), { source: 'query' })

    await new Promise((resolve) => setImmediate(resolve))

    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockError).toHaveBeenCalled()
  })

  it('swallows backend transport failures and only logs warning', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'))

    const service = loadService(true)

    service.init()
    service.captureException(new Error('Server exploded'), { source: 'bootstrap' })

    await new Promise((resolve) => setImmediate(resolve))

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(mockWarn).toHaveBeenCalled()
  })
})
