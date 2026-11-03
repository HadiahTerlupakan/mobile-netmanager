import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { requestForegroundLocationWithDisclosure } from '@/utils/locationDisclosure';

const mockSubscribeToScope = jest.fn();
const mockUseLocalSearchParams = jest.fn<() => Record<string, string | undefined>>(() => ({ id: undefined }));
const mockUseWorkOrder = jest.fn<() => unknown>();
const mockUseIsFocused = jest.fn(() => false);

jest.mock('@/services/RealtimeService', () => ({
  realtimeService: {
    subscribeToScope: mockSubscribeToScope,
  },
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    WORK_ORDER: 'work_order',
  },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockUseIsFocused(),
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    token: 'token-123',
    user: { id: 'user-1', role: 'USER', employeeType: 'TEKNISI' },
  }),
}));

jest.mock('@/hooks/queries', () => ({
  useWorkOrder: () => mockUseWorkOrder(),
  useApiMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  isOfflineMutationQueuedResult: jest.fn(() => false),
  queryKeys: {
    workOrders: {
      detail: jest.fn(() => ['work-orders', 'detail']),
    },
  },
}));

jest.mock('@/services/TenantService', () => ({
  TenantService: {
    getTenantUrl: jest.fn(() => 'https://tenant.test'),
  },
}));

jest.mock('@/services/UploadService', () => ({
  uploadService: {
    uploadCustom: jest.fn(),
  },
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('@/utils/locationDisclosure', () => ({
  requestForegroundLocationWithDisclosure: jest.fn(() => new Promise(() => undefined)),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    socket: jest.fn(),
  },
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));

jest.mock('@/utils/date', () => ({
  formatDate: jest.fn(() => '2026-04-10'),
}));

jest.mock('@/components/atoms/ImageWithCache', () => ({ ImageWithCache: () => null }));
jest.mock('@/components/molecules/ImageViewerModal', () => ({ ImageViewerModal: () => null }));
jest.mock('@/components/molecules/LoadingModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/molecules/WorkOrderDetailSkeleton', () => ({ WorkOrderDetailSkeleton: () => null }));
jest.mock('@shopify/flash-list', () => ({ FlashList: 'FlashList' }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 'Balanced' },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('lucide-react-native', () => ({
  ArrowLeft: 'ArrowLeft',
  Calendar: 'Calendar',
  Camera: 'Camera',
  CheckCircle: 'CheckCircle',
  CheckSquare: 'CheckSquare',
  Eye: 'Eye',
  Clock: 'Clock',
  FileText: 'FileText',
  History: 'History',
  Image: 'ImageIcon',
  ListChecks: 'ListChecks',
  MapPin: 'MapPin',
  MessageSquare: 'MessageSquare',
  Package: 'Package',
  PackagePlus: 'PackagePlus',
  Pause: 'Pause',
  Phone: 'Phone',
  Play: 'Play',
  Square: 'Square',
  User: 'User',
  X: 'X',
}));
jest.mock('twrnc', () => require('twrnc-kosong'));

const CURRENT_USER_ID = 'user-1';
const OTHER_TECHNICIAN_ID = 'user-2';
const OBSERVER_NOTE = 'Mode lihat saja — Anda bukan teknisi WO ini.';

type ViewerAccess = 'PARTICIPANT' | 'CLAIMABLE' | 'OBSERVER' | undefined;

interface WorkOrderOverrides {
  assignedToId: string;
  viewerAccess: ViewerAccess;
  status?: string;
  assignments?: Record<string, unknown>[];
}

const APPROVED_PARTNER = {
  id: 'as-1', userId: 'user-3', role: 'PARTNER', status: 'APPROVED', user: { id: 'user-3', name: 'Partner' },
};

function buildWorkOrder(overrides: WorkOrderOverrides) {
  return {
    id: 'wo-1',
    workOrderNumber: 'WO-001',
    title: 'Perbaikan',
    description: null,
    status: overrides.status ?? 'IN_PROGRESS',
    type: 'REPAIR',
    priority: 'MEDIUM',
    scheduledDate: null,
    startedAt: null,
    completedAt: null,
    locationAddress: null,
    contactName: null,
    contactPhone: null,
    assignedToId: overrides.assignedToId,
    assignedTo: { id: overrides.assignedToId, name: 'Lead' },
    tasks: [],
    assignments: overrides.assignments ?? [APPROVED_PARTNER],
    updates: [],
    attachments: [],
    usedMaterials: [],
    returnedMaterials: [],
    ...(overrides.viewerAccess ? { viewerAccess: overrides.viewerAccess } : {}),
  };
}

function renderDetail(workOrder: ReturnType<typeof buildWorkOrder>) {
  mockUseWorkOrder.mockReturnValue({ data: { data: workOrder }, isPending: false, refetch: jest.fn() });
  const WorkOrderDetailScreen = require('../../app/(app)/work-order-detail/[id]').default;
  return render(<WorkOrderDetailScreen />);
}

// lucide-react-native di-mock jadi host string; ikon X di tab Info hanya
// dipakai tombol hapus partner (tidak ada aksi lain yang tampil di kasus ini).
function countRemovePartnerIcons(screen: ReturnType<typeof render>) {
  return screen.UNSAFE_queryAllByType('X' as unknown as React.ComponentType).length;
}

describe('mobile work order detail observer mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'wo-1' });
  });

  it('shows the read-only note and hides every action for an OBSERVER', () => {
    const screen = renderDetail(buildWorkOrder({ assignedToId: OTHER_TECHNICIAN_ID, viewerAccess: 'OBSERVER' }));

    expect(screen.getByText(OBSERVER_NOTE)).toBeTruthy();
    expect(screen.queryByText('+ Tambah')).toBeNull();
    expect(countRemovePartnerIcons(screen)).toBe(0);
    expect(screen.queryByText('Tunda')).toBeNull();
    expect(screen.queryByText('Selesai')).toBeNull();
  });

  it('keeps the WO read-only for an OBSERVER even if assignment fields look like mine', () => {
    const screen = renderDetail(buildWorkOrder({ assignedToId: CURRENT_USER_ID, viewerAccess: 'OBSERVER' }));

    expect(screen.getByText(OBSERVER_NOTE)).toBeTruthy();
    expect(screen.queryByText('Tunda')).toBeNull();
    expect(screen.queryByText('Selesai')).toBeNull();
    expect(screen.queryByText('Anda adalah Lead Teknisi')).toBeNull();
  });

  it.each<ViewerAccess>(['PARTICIPANT', undefined])(
    'keeps the actions for the assigned technician when viewerAccess is %s',
    (viewerAccess) => {
      const screen = renderDetail(buildWorkOrder({ assignedToId: CURRENT_USER_ID, viewerAccess }));

      expect(screen.queryByText(OBSERVER_NOTE)).toBeNull();
      expect(screen.getByText('Tunda')).toBeTruthy();
      expect(screen.getByText('Selesai')).toBeTruthy();
      expect(screen.getByText('+ Tambah')).toBeTruthy();
    },
  );

  it('keeps today\'s team actions for a non-participant when the field is missing (old server)', () => {
    const screen = renderDetail(buildWorkOrder({ assignedToId: OTHER_TECHNICIAN_ID, viewerAccess: undefined }));

    expect(screen.queryByText(OBSERVER_NOTE)).toBeNull();
    expect(screen.getByText('+ Tambah')).toBeTruthy();
    expect(countRemovePartnerIcons(screen)).toBe(1);
  });

  it.each([
    ['ASSIGNED', 'Mulai Pekerjaan'],
    ['ON_HOLD', 'Lanjutkan Pekerjaan'],
  ])('hides the %s start action for an OBSERVER', (status, actionLabel) => {
    const observer = renderDetail(
      buildWorkOrder({ assignedToId: CURRENT_USER_ID, viewerAccess: 'OBSERVER', status, assignments: [] }),
    );
    expect(observer.queryByText(actionLabel)).toBeNull();

    const participant = renderDetail(
      buildWorkOrder({ assignedToId: CURRENT_USER_ID, viewerAccess: 'PARTICIPANT', status, assignments: [] }),
    );
    expect(participant.getByText(actionLabel)).toBeTruthy();
  });

  it('hides the partner invitation response for a pending-partner OBSERVER', () => {
    const pendingInvite = {
      id: 'as-2', userId: CURRENT_USER_ID, role: 'PARTNER', status: 'PENDING', user: { id: CURRENT_USER_ID, name: 'Saya' },
    };
    const screen = renderDetail(buildWorkOrder({
      assignedToId: OTHER_TECHNICIAN_ID, viewerAccess: 'OBSERVER', status: 'ASSIGNED', assignments: [pendingInvite],
    }));

    expect(screen.queryByText('Terima')).toBeNull();
    expect(screen.queryByText('Anda diundang sebagai partner untuk WO ini')).toBeNull();
    expect(screen.UNSAFE_queryAllByType('CheckCircle' as unknown as React.ComponentType)).toHaveLength(0);
  });

  it('locks the Tugas, Barang and Diskusi tabs without the "Mulai Kerja" prompt for an OBSERVER', () => {
    const workOrder = buildWorkOrder({ assignedToId: CURRENT_USER_ID, viewerAccess: 'OBSERVER' });
    workOrder.tasks = [{ id: 'task-1', title: 'Cek ODP', status: 'PENDING' }] as never[];
    const screen = renderDetail(workOrder);

    fireEvent.press(screen.getByText('Tugas'));
    expect(screen.getByText('Cek ODP')).toBeDisabled();
    expect(screen.queryByText(/Mulai Kerja|Hanya lead teknisi/)).toBeNull();

    fireEvent.press(screen.getByText('Barang'));
    expect(screen.getByText('Ambil Barang / Material')).toBeDisabled();
    expect(screen.getByText('Kembalikan Barang')).toBeDisabled();
    expect(screen.queryByText(/Mulai Kerja/)).toBeNull();

    fireEvent.press(screen.getByText('Diskusi'));
    expect(screen.UNSAFE_getByType(TextInput).props.editable).toBe(false);
    expect(screen.getByText('Kirim')).toBeDisabled();
    expect(screen.queryByText(/Mulai Kerja|Hanya lead teknisi/)).toBeNull();
  });

  it('keeps today\'s "Mulai Kerja" prompt for a participant before work starts', () => {
    const screen = renderDetail(buildWorkOrder({
      assignedToId: CURRENT_USER_ID, viewerAccess: 'PARTICIPANT', status: 'ASSIGNED', assignments: [],
    }));

    fireEvent.press(screen.getByText('Barang'));
    expect(screen.getByText(/Klik "Mulai Kerja" terlebih dahulu/)).toBeTruthy();
  });

  it('keeps today\'s behaviour for a CLAIMABLE viewer', () => {
    const screen = renderDetail(buildWorkOrder({
      assignedToId: OTHER_TECHNICIAN_ID, viewerAccess: 'CLAIMABLE', status: 'PENDING', assignments: [],
    }));

    expect(screen.queryByText(OBSERVER_NOTE)).toBeNull();
    fireEvent.press(screen.getByText('Tugas'));
    expect(screen.getByText(/Klik "Mulai Kerja" terlebih dahulu/)).toBeTruthy();
  });

  it('does not ask an OBSERVER for location permission', () => {
    renderDetail(buildWorkOrder({ assignedToId: OTHER_TECHNICIAN_ID, viewerAccess: 'OBSERVER' }));

    expect(requestForegroundLocationWithDisclosure).not.toHaveBeenCalled();
  });

  it.each<ViewerAccess>(['PARTICIPANT', undefined])(
    'still asks for location once when viewerAccess is %s',
    (viewerAccess) => {
      const screen = renderDetail(buildWorkOrder({ assignedToId: CURRENT_USER_ID, viewerAccess }));
      screen.rerender(React.createElement(require('../../app/(app)/work-order-detail/[id]').default));

      expect(requestForegroundLocationWithDisclosure).toHaveBeenCalledTimes(1);
    },
  );

  it('waits for the detail to load before asking for location', () => {
    mockUseWorkOrder.mockReturnValue({ data: undefined, isPending: true, refetch: jest.fn() });
    const WorkOrderDetailScreen = require('../../app/(app)/work-order-detail/[id]').default;
    render(<WorkOrderDetailScreen />);

    expect(requestForegroundLocationWithDisclosure).not.toHaveBeenCalled();
  });
});
