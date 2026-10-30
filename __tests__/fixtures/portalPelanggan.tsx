import { jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/** Notifikasi batch TanStack berjalan lewat `setTimeout(0)`; beberapa putaran untuk query → mutasi → invalidasi. */
export const selesaikanJanji = () =>
  act(async () => {
    for (let putaran = 0; putaran < 5; putaran += 1) {
      await new Promise((selesai) => setTimeout(selesai, 0));
    }
  });

/** Render layar di dalam QueryClient sungguhan; pemanggilan HTTP tetap lewat `api` yang di-mock. */
export function renderDenganQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } } });
  return { ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>), client };
}

/** Galat axios dengan badan respons portal pelanggan (`{ success: false, error }`). */
export function galatHttp(status: number, pesan: string) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { success: false, error: pesan } },
  });
}

/** Teks toast terakhir (judul & isi) yang ditampilkan lewat `errorPresenter`. */
export function toastTerakhir(): { text1?: string; text2?: string } | undefined {
  // Mock global (jest.setup.js) tanpa `__esModule`, jadi impor default `Toast` = modul itu sendiri.
  const Toast = jest.requireMock('react-native-toast-message') as { show: jest.Mock };
  return Toast.show.mock.calls.at(-1)?.[0] as { text1?: string; text2?: string } | undefined;
}
