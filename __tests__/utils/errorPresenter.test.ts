import Toast from 'react-native-toast-message';
import { presentAppError, presentSuccessMessage, registerErrorReporter } from '@/utils/errorPresenter';

const mockCaptureException = jest.fn();

describe('errorPresenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registerErrorReporter({
      captureException: mockCaptureException,
    });
  });

  it('presents reportable errors and captures exception context', async () => {
    const error = new Error('Database connection failed');
    presentAppError(error, { 
      source: 'Fetching inventory', 
      report: true 
    });

    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
    }));
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'Fetching inventory',
      })
    );
  });

  it('can skip reporting for user-facing handled errors', async () => {
    const error = new Error('Invalid input');
    presentAppError(error, { 
      report: false 
    });

    expect(Toast.show).toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('presents success messages consistently', () => {
    presentSuccessMessage('Password berhasil diubah');

    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      text2: 'Password berhasil diubah',
    }));
  });
});
