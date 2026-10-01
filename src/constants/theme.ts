/**
 * Warna NETRAL mode terang/gelap (teks, latar, ikon, skeleton). Warna
 * identitas/aksen (tombol utama, tab aktif, tautan) TIDAK di sini, melainkan
 * di `@/theme` (`useTemaPersona`) karena berbeda per persona.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    icon: '#687076',
    skeleton: '#E1E9EE',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    icon: '#9BA1A6',
    skeleton: '#2C2C2E',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
