import { uploadService } from '../../src/services/UploadService';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

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

describe('UploadService', () => {
  const mockToken = 'mock-token';
  const mockUri = 'file://path/to/photo.jpg';
  const mockUrl = 'https://api.example.com/uploads/photo.jpg';
  const mockType = 'work-order-updates';

  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
  });

  describe('uploadFile', () => {
    it('should throw error if no token is available', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await expect(uploadService.uploadFile(mockUri, mockType)).rejects.toThrow(
        'Authentication required for upload'
      );
    });

    it('should upload file successfully without progress callback', async () => {
      const mockResponse = {
        status: 200,
        body: JSON.stringify({ url: mockUrl }),
      };
      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue(mockResponse);

      const result = await uploadService.uploadFile(mockUri, mockType);

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('session_token');
      expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
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
        })
      );
      expect(result).toBe(mockUrl);
    });

    it('should upload file successfully with progress callback', async () => {
      const mockUploadTask = {
        uploadAsync: jest.fn().mockResolvedValue({
          status: 200,
          body: JSON.stringify({ url: mockUrl }),
        }),
      };

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
      const successResponse = { status: 200, body: JSON.stringify({ url: mockUrl }) };

      (FileSystem.uploadAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(successResponse);

      const result = await uploadService.uploadFile(mockUri, mockType, { maxRetries: 1 });

      expect(FileSystem.uploadAsync).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockUrl);
    });

    it('should throw error after max retries', async () => {
      (FileSystem.uploadAsync as jest.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(
        uploadService.uploadFile(mockUri, mockType, { maxRetries: 1 })
      ).rejects.toThrow('Network Error');

      expect(FileSystem.uploadAsync).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should handle non-200 response status', async () => {
      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 400,
        body: 'Bad Request',
      });

      await expect(uploadService.uploadFile(mockUri, mockType)).rejects.toThrow(
        'Upload failed with status 400: Bad Request'
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
        'Authentication required for upload cleanup'
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
