import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('twrnc', () => () => ({}));

import { PilihanChip } from '@/components/molecules/PilihanChip';

const OPSI = [
  { nilai: 'KUNJUNGAN', label: 'Kunjungan' },
  { nilai: 'TELEPON', label: 'Telepon' },
] as const;

describe('PilihanChip', () => {
  it('mengirim nilai opsi yang ditekan dan menandai yang terpilih', () => {
    const onPilih = jest.fn();
    const { getByText, getByRole } = render(<PilihanChip opsi={OPSI} terpilih="TELEPON" onPilih={onPilih} />);

    fireEvent.press(getByText('Kunjungan'));

    expect(onPilih).toHaveBeenCalledWith('KUNJUNGAN');
    expect(getByRole('button', { name: 'Telepon' }).props.accessibilityState).toEqual({ selected: true });
  });
});
