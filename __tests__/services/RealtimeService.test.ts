import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCollection = jest.fn();
const mockGetFirestore = jest.fn();
const mockLimit = jest.fn();
const mockOnSnapshot = jest.fn();
const mockOrderBy = jest.fn();
const mockQuery = jest.fn();
const mockGetMobileFirebaseApp = jest.fn(() => ({ name: 'mobile-app' }));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: mockCollection,
  getFirestore: mockGetFirestore,
  limit: mockLimit,
  onSnapshot: mockOnSnapshot,
  orderBy: mockOrderBy,
  query: mockQuery,
}));

jest.mock('@/services/firebaseApp', () => ({
  getMobileFirebaseApp: mockGetMobileFirebaseApp,
}));

describe('RealtimeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFirestore.mockReturnValue({ name: 'firestore' });
    mockCollection.mockReturnValue('collection-ref');
    mockOrderBy.mockReturnValue('order-by');
    mockLimit.mockReturnValue('limit');
    mockQuery.mockReturnValue('query-ref');
  });

  it('ignores replayed documents from the initial Firestore snapshot', () => {
    const unsubscribe = jest.fn();
    const handler = jest.fn();

    mockOnSnapshot.mockImplementation((...args: any[]) => {
      const callback = args[1] as (snapshot: any) => void;

      callback({
        docs: [
          {
            id: 'existing-event',
            data: () => ({
              type: 'inventory.update',
              payload: { type: 'masuk' },
            }),
          },
        ],
        docChanges: () => [
          {
            type: 'added',
            doc: {
              id: 'existing-event',
              data: () => ({
                type: 'inventory.update',
                payload: { type: 'masuk' },
              }),
            },
          },
        ],
      });

      return unsubscribe;
    });

    const { realtimeService } = require('../../src/services/RealtimeService');

    const cleanup = realtimeService.subscribeToUserStream('user-1', handler);

    expect(handler).not.toHaveBeenCalled();
    expect(cleanup).toBe(unsubscribe);
  });

  it('emits only newly added documents after the initial snapshot is hydrated', () => {
    const handler = jest.fn();
    let snapshotListener: ((snapshot: any) => void) | undefined;

    mockOnSnapshot.mockImplementation((...args: any[]) => {
      snapshotListener = args[1] as (snapshot: any) => void;
      return jest.fn();
    });

    const { realtimeService } = require('../../src/services/RealtimeService');

    realtimeService.subscribeToUserStream('user-1', handler);

    snapshotListener?.({
      docs: [
        {
          id: 'existing-event',
          data: () => ({
            type: 'inventory.update',
            payload: { type: 'masuk' },
          }),
        },
      ],
      docChanges: () => [
        {
          type: 'added',
          doc: {
            id: 'existing-event',
            data: () => ({
              type: 'inventory.update',
              payload: { type: 'masuk' },
            }),
          },
        },
      ],
    });

    snapshotListener?.({
      docs: [],
      docChanges: () => [
        {
          type: 'added',
          doc: {
            id: 'new-event',
            data: () => ({
              type: 'inventory.update',
              payload: { type: 'keluar' },
            }),
          },
        },
        {
          type: 'added',
          doc: {
            id: 'new-event',
            data: () => ({
              type: 'inventory.update',
              payload: { type: 'keluar' },
            }),
          },
        },
      ],
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: 'inventory.update',
      payload: { type: 'keluar' },
      scope: { kind: 'user', id: 'user-1' },
      createdAt: undefined,
    });
  });
});
