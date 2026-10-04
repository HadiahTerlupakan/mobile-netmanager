import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockCapture = jest.fn();
jest.mock('react-native-view-shot', () => ({ captureRef: (...args: unknown[]) => mockCapture(...args) }));
jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: View, Path: View };
});

import { PapanTandaTangan } from '@/components/organisms/pengesahan/PapanTandaTangan';

describe('PapanTandaTangan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('memberi tahu kotak kosong tanpa menangkap gambar', () => {
    const onSimpan = jest.fn();
    const onKosong = jest.fn();
    const { getByText } = render(<PapanTandaTangan isMengirim={false} onSimpan={onSimpan} onKosong={onKosong} />);

    fireEvent.press(getByText('Simpan tanda tangan'));

    expect(onKosong).toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
    expect(onSimpan).not.toHaveBeenCalled();
  });

  it('menangkap kotak menjadi data URL PNG setelah ada goresan', async () => {
    mockCapture.mockResolvedValue('data:image/png;base64,AAAA');
    const onSimpan = jest.fn();
    const { getByText, UNSAFE_root } = render(<PapanTandaTangan isMengirim={false} onSimpan={onSimpan} onKosong={jest.fn()} />);

    const kotak = UNSAFE_root.findAll((node: { props: Record<string, unknown> }) => typeof node.props.onResponderGrant === 'function')[0];
    fireEvent(kotak, 'responderGrant', { nativeEvent: { locationX: 4, locationY: 4, touches: [], changedTouches: [] }, touchHistory: { touchBank: [] } });
    fireEvent.press(getByText('Simpan tanda tangan'));

    await waitFor(() => expect(onSimpan).toHaveBeenCalledWith('data:image/png;base64,AAAA'));
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ format: 'png', result: 'data-uri' }));
  });
});
