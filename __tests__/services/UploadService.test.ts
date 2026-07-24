import { uploadService } from '../../src/services/UploadService';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { TokenService } from '../../src/services/TokenService';
import { RefreshTokenService } from '../../src/services/RefreshTokenService';

// Mock dependencies
jest.mock('../../src/constants/Config', () => ({
  Config: {
    API_URL: 'https://api.example.com',
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  createUploadTask: jest.fn(),
  FileSystemUploadType: {
    MULTIPART: 'multipart',
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
}));

jest.mock('@/utils/logger', () => require('../../__mocks__/logger'));

jest.mock('../../src/utils/errorHandling', () => ({
  getUserFriendlyError: jest.fn((error) => ({
    title: 'Error',
    message: error.message || 'Unknown error',
  })),
}));

jest.mock('../../src/services/RefreshTokenService', () => ({
  RefreshTokenService: {
    refreshAccessToken: jest.fn(),
  },
}));

describe('UploadService', () => {
  const mockToken = 'mock-token';
  const mockUri = 'file://path/to/photo.jpg';
  const mockUrl = 'https://api.example.com/uploads/photo.jpg';
  const mockType = 'work-order-updates';

  let mockUploadTask: any;

  beforeEach(() => {
    jest.clearAllMocks();
    TokenService.setToken(null);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
    (RefreshTokenService.refreshAccessToken as jest.Mock).mockResolvedValue(null);

    mockUploadTask = {
      uploadAsync: jest.fn().mockResolvedValue({
        status: 200,
        body: JSON.stringify({ url: mockUrl }),
      }),
      cancelAsync: jest.fn().mockResolvedValue(undefined),
    };

    (FileSystem.createUploadTask as jest.Mock).mockReturnValue(mockUploadTask);
  });

  describe('uploadFile', () => {
    it('should throw error if no token is available', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await expect(uploadService.uploadFile(mockUri, mockType)).rejects.toThrow(
        'Authentication required for upload'
      );
    });

    it('should upload file successfully without progress callback', async () => {
      const result = await uploadService.uploadFile(mockUri, mockType);

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('session_token');
      expect(FileSystem.createUploadTask).toHaveBeenCalledWith(
        expect.stringContaining('/api/mobile/upload'),
        mockUri,
        expect.objectContaining({
          httpMethod: 'POST',
          fieldName: 'file',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          parameters: expect.objectContaining({
            type: mockType,
          }),
        }),
        expect.any(Function)
      );
      expect(mockUploadTask.uploadAsync).toHaveBeenCalled();
      expect(result).toBe(mockUrl);
    });

    it('should upload file successfully with progress callback', async () => {
      // Mock createUploadTask to call the progress callback
      (FileSystem.createUploadTask as jest.Mock).mockImplementation(
        (_url, _uri, _options, onProgress) => {
          // Simulate progress
          if (onProgress) {
            onProgress({
              totalBytesExpectedToSend: 100,
              totalBytesSent: 50,
            });
            onProgress({
              totalBytesExpectedToSend: 100,
              totalBytesSent: 100,
            });
          }
          return mockUploadTask;
        }
      );

      const onProgress = jest.fn();
      const result = await uploadService.uploadFile(mockUri, mockType, { onProgress });

      expect(FileSystem.createUploadTask).toHaveBeenCalled();
      expect(mockUploadTask.uploadAsync).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenLastCalledWith({
        total: 100,
        uploaded: 100,
        percentage: 100,
      });
      expect(result).toBe(mockUrl);
    });

    it('should retry on failure', async () => {
      mockUploadTask.uploadAsync
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ status: 200, body: JSON.stringify({ url: mockUrl }) });

      const result = await uploadService.uploadFile(mockUri, mockType, { maxRetries: 1 });

      expect(mockUploadTask.uploadAsync).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockUrl);
    });

    it('should throw error after max retries', async () => {
      mockUploadTask.uploadAsync.mockRejectedValue(new Error('Network Error'));

      await expect(
        uploadService.uploadFile(mockUri, mockType, { maxRetries: 1 })
      ).rejects.toThrow('Network Error');

      expect(mockUploadTask.uploadAsync).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should handle non-200 response status', async () => {
      mockUploadTask.uploadAsync.mockResolvedValue({
        status: 400,
        body: 'Bad Request',
      });

      await expect(uploadService.uploadFile(mockUri, mockType)).rejects.toThrow(
        'Upload failed with status 400: Bad Request'
      );
    });

    it('should refresh token and retry once on 401', async () => {
      const newToken = 'refreshed-token';
      (RefreshTokenService.refreshAccessToken as jest.Mock).mockResolvedValue(newToken);
      mockUploadTask.uploadAsync
        .mockResolvedValueOnce({
          status: 401,
          body: JSON.stringify({ error: 'Token tidak valid' }),
        })
        .mockResolvedValueOnce({
          status: 200,
          body: JSON.stringify({ url: mockUrl }),
        });

      const result = await uploadService.uploadFile(mockUri, mockType, { maxRetries: 0 });

      expect(RefreshTokenService.refreshAccessToken).toHaveBeenCalled();
      expect(mockUploadTask.uploadAsync).toHaveBeenCalledTimes(2);
      expect(FileSystem.createUploadTask).toHaveBeenLastCalledWith(
        expect.any(String),
        mockUri,
        expect.objectContaining({
          headers: { Authorization: `Bearer ${newToken}` },
        }),
        expect.any(Function),
      );
      expect(result).toBe(mockUrl);
    });

    it('should throw when 401 and refresh fails', async () => {
      (RefreshTokenService.refreshAccessToken as jest.Mock).mockResolvedValue(null);
      mockUploadTask.uploadAsync.mockResolvedValue({
        status: 401,
        body: JSON.stringify({ error: 'Token tidak valid' }),
      });

      await expect(
        uploadService.uploadFile(mockUri, mockType, { maxRetries: 0 }),
      ).rejects.toThrow(/status 401/);
    });

    it('should refresh proactively when token near expiry', async () => {
      const nearExpiry =
        Math.floor(Date.now() / 1000) + 30; // 30s left
      const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ exp: nearExpiry })).toString('base64url');
      const expiringToken = `${header}.${payload}.sig`;
      TokenService.setToken(expiringToken);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(expiringToken);

      const freshToken = 'fresh-after-proactive';
      (RefreshTokenService.refreshAccessToken as jest.Mock).mockResolvedValue(freshToken);

      await uploadService.uploadFile(mockUri, mockType);

      expect(RefreshTokenService.refreshAccessToken).toHaveBeenCalled();
      expect(FileSystem.createUploadTask).toHaveBeenCalledWith(
        expect.any(String),
        mockUri,
        expect.objectContaining({
          headers: { Authorization: `Bearer ${freshToken}` },
        }),
        expect.any(Function),
      );
    });
  });

  describe('uploadBatch', () => {
    it('should upload multiple files sequentially', async () => {
      const uris = ['file1.jpg', 'file2.jpg'];
      const mockUrls = ['url1', 'url2'];

      const mockUploadTask = {
        uploadAsync: jest.fn()
          .mockResolvedValueOnce({ status: 200, body: JSON.stringify({ url: mockUrls[0] }) })
          .mockResolvedValueOnce({ status: 200, body: JSON.stringify({ url: mockUrls[1] }) })
      };

      (FileSystem.createUploadTask as jest.Mock).mockReturnValue(mockUploadTask);

      const onProgress = jest.fn();
      const results = await uploadService.uploadBatch(uris, mockType, onProgress);

      // uploadBatch always provides an onProgress callback to uploadFile,
      // so it uses createUploadTask instead of uploadAsync
      expect(FileSystem.createUploadTask).toHaveBeenCalledTimes(2);
      expect(mockUploadTask.uploadAsync).toHaveBeenCalledTimes(2);
      expect(results).toEqual(mockUrls);
    });
  });

  describe('deleteUploadedFile', () => {
    it('should throw error if no token is available for upload cleanup', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

      await expect(uploadService.deleteUploadedFile(mockUrl)).rejects.toThrow(
        'Authentication required for upload'
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should delete uploaded file with authenticated request', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response) as jest.MockedFunction<typeof fetch>;

      await uploadService.deleteUploadedFile(mockUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/mobile/upload?url=${encodeURIComponent(mockUrl)}`),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );
    });
  });
});
