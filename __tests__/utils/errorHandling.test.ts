import { getUserFriendlyError } from '@/utils/errorHandling';

describe('errorHandling taxonomy', () => {
  it('marks server errors as reportable and retryable', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed with status code 500',
      response: {
        status: 500,
        data: {},
      },
    };

    expect(getUserFriendlyError(error)).toMatchObject({
      kind: 'server',
      severity: 'error',
      reportable: true,
      retryable: true,
      audience: 'both',
    });
  });

  it('preserves backend validation messages with validation metadata', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed with status code 422',
      response: {
        status: 422,
        data: {
          message: 'Password minimal 8 karakter',
        },
      },
    };

    expect(getUserFriendlyError(error)).toMatchObject({
      kind: 'validation',
      title: 'Periksa Data',
      message: 'Password minimal 8 karakter',
      reportable: false,
      retryable: false,
    });
  });

  it('sanitizes technical unknown errors', () => {
    expect(getUserFriendlyError(new Error('TypeError: undefined is not an object'))).toMatchObject({
      kind: 'unknown',
      severity: 'error',
      message: 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.',
    });
  });
});
