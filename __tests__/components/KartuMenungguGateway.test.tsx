import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));
jest.mock('react-native-qrcode-svg', () => {
  const { Text: TeksQr } = require('react-native');
  return ({ value }: { value: string }) => <TeksQr>{`QR:${value}`}</TeksQr>;
});

import { KartuMenungguGateway } from '@/components/organisms/tagihan/KartuMenungguGateway';

const aksi = () => ({
  onSalin: jest.fn(),
  onBukaHalamanBayar: jest.fn(),
  onGantiMetode: jest.fn(),
});

describe('KartuMenungguGateway', () => {
  it('menampilkan QRIS di aplikasi, bukan mengalihkan ke halaman gateway', () => {
    const { getByText, queryByText } = render(
      <KartuMenungguGateway nominal="Rp 1.110" stringQris="000201ABC" urlBayar="https://gw/bayar" {...aksi()} />,
    );

    expect(getByText('QR:000201ABC')).toBeTruthy();
    expect(getByText('Rp 1.110')).toBeTruthy();
    expect(queryByText('Lanjutkan ke Halaman Pembayaran')).toBeNull();
  });

  it('nomor VA bisa disalin dengan labelnya', () => {
    const props = aksi();
    const { getByText, getByLabelText } = render(
      <KartuMenungguGateway nominal="Rp 11.100" nomorVa="7007014001234567" namaMetode="BCA Virtual Account" {...props} />,
    );

    expect(getByText('Nomor Virtual Account BCA Virtual Account')).toBeTruthy();
    fireEvent.press(getByLabelText('Salin Nomor Virtual Account'));
    expect(props.onSalin).toHaveBeenCalledWith('7007014001234567', 'Nomor Virtual Account');
  });

  it('minimarket memakai label kode pembayaran', () => {
    const props = aksi();
    const { getByLabelText } = render(
      <KartuMenungguGateway nominal="Rp 11.100" nomorVa="FT123" jenisMetode="RETAIL" {...props} />,
    );

    fireEvent.press(getByLabelText('Salin Kode Pembayaran'));
    expect(props.onSalin).toHaveBeenCalledWith('FT123', 'Kode Pembayaran');
  });

  it('tanpa instruksi, pelanggan diarahkan ke halaman bayar gateway', () => {
    const props = aksi();
    const { getByText } = render(<KartuMenungguGateway nominal="Rp 11.100" urlBayar="https://gw/bayar" {...props} />);

    fireEvent.press(getByText('Lanjutkan ke Halaman Pembayaran'));
    expect(props.onBukaHalamanBayar).toHaveBeenCalled();
  });

  it('metode bisa diganti selama belum dibayar', () => {
    const props = aksi();
    const { getByText } = render(<KartuMenungguGateway nominal="Rp 11.100" nomorVa="7007" {...props} />);

    fireEvent.press(getByText('Ganti Metode Pembayaran'));
    expect(props.onGantiMetode).toHaveBeenCalled();
  });
});
