import { describe, expect, it, jest } from '@jest/globals';
import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import React from 'react';

/**
 * Edit Profil dan Ganti Password adalah tab tersembunyi di bawah Profil.
 * Dengan `backBehavior` bawaan Tabs (`firstRoute`), `router.back()` dari sana
 * — tombol kembali maupun setelah simpan — selalu mendarat di Beranda.
 * Tes ini memakai router sungguhan (bukan mock) dengan layout pelanggan asli.
 */

// `expo` dan `expo-modules-core` asli butuh modul native; router hanya
// menyentuh tiga fungsi ini dan `Platform` saat dimuat.
jest.mock('expo', () => ({
  requireOptionalNativeModule: () => null,
  requireNativeView: () => () => null,
  registerRootComponent: () => undefined,
}));
jest.mock('expo-modules-core', () => ({ Platform: { OS: 'android' } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerLayout from '../../app/(customer)/_layout';

const Kosong = () => null;

function renderPortalPelanggan() {
  return renderRouter(
    {
      '(customer)/_layout': CustomerLayout,
      '(customer)/dashboard': Kosong,
      '(customer)/koneksi/index': Kosong,
      '(customer)/tagihan/index': Kosong,
      '(customer)/paket/index': Kosong,
      '(customer)/profile': Kosong,
      '(customer)/edit-profil': Kosong,
      '(customer)/ganti-password': Kosong,
    },
    { initialUrl: '/dashboard' },
  );
}

describe('kembali dari layar turunan Profil', () => {
  it.each(['/(customer)/edit-profil', '/(customer)/ganti-password'] as const)(
    'kembali dari %s mendarat di Profil, bukan Beranda',
    (rute) => {
      const layar = renderPortalPelanggan();

      act(() => router.push('/(customer)/profile'));
      act(() => router.push(rute));
      expect(layar.getPathname()).toBe(rute.replace('/(customer)', ''));
      act(() => router.back());

      expect(layar.getPathname()).toBe('/profile');
    },
  );
});
