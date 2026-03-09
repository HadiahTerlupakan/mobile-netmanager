const mockAlertError = jest.fn();
const mockAlertInfo = jest.fn();
const mockAlertSuccess = jest.fn();
const mockAlertCustom = jest.fn();

jest.mock('@/utils/alert', () => ({
  AlertService: {
    error: mockAlertError,
    info: mockAlertInfo,
    success: mockAlertSuccess,
    custom: mockAlertCustom,
  },
}));

const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();

jest.mock('@/services/ErrorReportingService', () => ({
  errorReportingService: {
    captureException: mockCaptureException,
    captureMessage: mockCaptureMessage,
  },
}));

describe('errorPresenter', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('presents reportable errors and captures exception context', () => {
    const { presentAppError } = require('@/utils/errorPresenter');

    presentAppError(new Error('TypeError: boom'), {
      screen: 'LoginScreen',
      route: '/(auth)/login',
    });

    expect(mockAlertError).toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        screen: 'LoginScreen',
        route: '/(auth)/login',
        source: 'ui',
      })
    );
  });

  it('can skip reporting for user-facing handled errors', () => {
    const { presentAppError } = require('@/utils/errorPresenter');

    presentAppError(
      {
        isAxiosError: true,
        message: 'Unauthorized',
        response: { status: 401, data: {} },
      },
      { report: false }
    );

    expect(mockAlertError).toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('presents success messages consistently', () => {
    const { presentSuccessMessage } = require('@/utils/errorPresenter');

    presentSuccessMessage('Password berhasil diubah');

    expect(mockAlertSuccess).toHaveBeenCalledWith('Berhasil', 'Password berhasil diubah');
  });
});
