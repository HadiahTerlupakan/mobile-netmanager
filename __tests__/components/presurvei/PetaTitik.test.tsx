import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

jest.mock('twrnc', () => () => ({}));

const TITIK = { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 };

describe('PetaTitik', () => {
  it('menampilkan koordinat teks bila MapLibre tidak tersedia', () => {
    jest.resetModules();
    jest.doMock('@/utils/maplibre', () => ({ getMapLibre: () => null }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PetaTitik } = require('@/components/organisms/presurvei/PetaTitik');
    const { getByText } = render(<PetaTitik titik={TITIK} />);

    expect(getByText('-6.200000, 106.800000')).toBeTruthy();
  });

  it('menampilkan peta pada titik dan zoom yang benar bila MapLibre tersedia', () => {
    jest.resetModules();
    const mockCamera = jest.fn((_props: unknown) => null);
    const mockMapView = jest.fn((_props: unknown) => null);
    jest.doMock('@/utils/maplibre', () => ({
      getMapLibre: () => ({
        MapView: ({ children, ...props }: { children?: React.ReactNode }) => {
          mockMapView(props);
          return <>{children}</>;
        },
        Camera: (props: unknown) => {
          mockCamera(props);
          return null;
        },
        PointAnnotation: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PetaTitik } = require('@/components/organisms/presurvei/PetaTitik');
    const { UNSAFE_getByProps } = render(<PetaTitik titik={TITIK} />);

    expect(mockCamera).toHaveBeenCalledWith(
      expect.objectContaining({ centerCoordinate: [106.8, -6.2], zoomLevel: 16 }),
    );

    // Peta hanya penanda titik GPS, tidak boleh bisa digeser/di-zoom manual.
    expect(mockMapView).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollEnabled: false,
        zoomEnabled: false,
        rotateEnabled: false,
        pitchEnabled: false,
      }),
    );
    // Pembungkusnya juga mengabaikan sentuhan, jadi peta tidak menangkap gesture apa pun.
    expect(UNSAFE_getByProps({ pointerEvents: 'none' })).toBeTruthy();
  });
});
