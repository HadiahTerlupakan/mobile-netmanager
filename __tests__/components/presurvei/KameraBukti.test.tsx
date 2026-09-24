import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('twrnc', () => () => ({}));

const mockUseCameraPermissions = jest.fn<() => [{ granted: boolean } | null, () => void]>();
const mockCameraView = jest.fn<(props: unknown) => void>();
const mockTakePicture = jest.fn<(opsi: { quality: number }) => Promise<{ uri: string } | undefined>>();

// Pola mock sama dengan `PetaTitik.test.tsx`: `CameraView` diganti komponen
// pasif yang merekam props-nya (dicek `facing`) dan meneruskan ref supaya
// `useKameraBukti` (hook asli, tidak dimock) bisa memanggil `takePictureAsync`.
jest.mock('expo-camera', () => {
  const ReactActual = require('react');
  return {
    CameraView: ReactActual.forwardRef((props: unknown, ref: unknown) => {
      mockCameraView(props);
      ReactActual.useImperativeHandle(ref, () => ({ takePictureAsync: mockTakePicture }));
      return null;
    }),
    useCameraPermissions: () => mockUseCameraPermissions(),
  };
});

jest.mock('@/utils/presurvei/fotoBukti', () => ({
  KUALITAS_FOTO_BUKTI: 0.7,
  perkecilFoto: (uri: string) => Promise.resolve(uri),
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
}));

import { KameraBukti } from '@/components/organisms/presurvei/KameraBukti';

describe('KameraBukti', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merender kamera belakang (facing back), bukan depan', () => {
    mockUseCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);

    render(<KameraBukti onAmbil={jest.fn()} onTutup={jest.fn()} />);

    expect(mockCameraView).toHaveBeenCalledWith(expect.objectContaining({ facing: 'back' }));
  });

  it('menampilkan fallback izin kamera saat izin belum diberikan', () => {
    mockUseCameraPermissions.mockReturnValue([{ granted: false }, jest.fn()]);

    const { getByText, queryByLabelText } = render(<KameraBukti onAmbil={jest.fn()} onTutup={jest.fn()} />);

    expect(getByText('Aplikasi butuh izin kamera untuk foto bukti.')).toBeTruthy();
    expect(queryByLabelText('Jepret')).toBeNull();
    expect(mockCameraView).not.toHaveBeenCalled();
  });

  it('menonaktifkan tombol jepret selagi memotret', async () => {
    mockUseCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);
    let selesaikanPotret: ((hasil: { uri: string }) => void) | undefined;
    mockTakePicture.mockImplementation(
      () => new Promise((resolve) => { selesaikanPotret = resolve; }),
    );

    const { getByLabelText } = render(<KameraBukti onAmbil={jest.fn()} onTutup={jest.fn()} />);

    expect(getByLabelText('Jepret').props.accessibilityState).toEqual({ disabled: false });

    fireEvent.press(getByLabelText('Jepret'));
    expect(getByLabelText('Jepret').props.accessibilityState).toEqual({ disabled: true });

    await act(async () => {
      selesaikanPotret?.({ uri: 'file:///cache/asli.jpg' });
      await Promise.resolve();
    });

    expect(getByLabelText('Jepret').props.accessibilityState).toEqual({ disabled: false });
  });
});
