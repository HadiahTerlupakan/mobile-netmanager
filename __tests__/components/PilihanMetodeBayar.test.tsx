import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { PilihanMetodeBayar } from '@/components/organisms/tagihan/PilihanMetodeBayar';

const METODE = [
  { id: 'BC', name: 'BCA Virtual Account', type: 'VA', code: 'BC', group: 'Virtual Account' },
  { id: 'SP', name: 'QRIS', type: 'QRIS', code: 'SP', group: 'E-Wallet & QRIS' },
  { id: 'M2', name: 'Mandiri Virtual Account', type: 'VA', code: 'M2', group: 'Virtual Account' },
];

describe('PilihanMetodeBayar', () => {
  it('mengelompokkan metode di bawah satu judul per grup, urut kemunculan', () => {
    const { getAllByText, toJSON } = render(<PilihanMetodeBayar metode={METODE} kodeTerpilih="" onPilih={jest.fn()} />);

    expect(getAllByText('Virtual Account')).toHaveLength(1);
    const teks = JSON.stringify(toJSON());
    expect(teks.indexOf('Virtual Account')).toBeLessThan(teks.indexOf('Mandiri Virtual Account'));
    expect(teks.indexOf('Mandiri Virtual Account')).toBeLessThan(teks.indexOf('E-Wallet & QRIS'));
  });

  it('menekan metode memilih kodenya dan menandainya terpilih', () => {
    const onPilih = jest.fn();
    const { getByLabelText, rerender } = render(<PilihanMetodeBayar metode={METODE} kodeTerpilih="" onPilih={onPilih} />);

    fireEvent.press(getByLabelText('QRIS'));
    expect(onPilih).toHaveBeenCalledWith('SP');

    rerender(<PilihanMetodeBayar metode={METODE} kodeTerpilih="SP" onPilih={onPilih} />);
    expect(getByLabelText('QRIS').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('BCA Virtual Account').props.accessibilityState).toEqual({ selected: false });
  });
});
