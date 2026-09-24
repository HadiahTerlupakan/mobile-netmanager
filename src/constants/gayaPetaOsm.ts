/**
 * Gaya peta raster OpenStreetMap untuk MapLibre, dipakai `LocationPickerModal`,
 * `WebLocationPicker`, dan `PetaTitik`. Konstanta modul, jadi referensinya
 * stabil tanpa `useMemo`. Sengaja TANPA anotasi tipe `StyleSpecification`:
 * paket `maplibre-gl` (web) mengekspornya lewat dua jalur re-export
 * (`export type * from '@maplibre/maplibre-gl-style-spec'` +
 * `export { StyleSpecification }`) yang gagal diresolusi TypeScript dalam
 * mode proyek penuh (`moduleResolution: "bundler"`) — `Module "maplibre-gl"
 * has no exported member 'StyleSpecification'` — walau terisolasi berhasil.
 * Sisi native (`@maplibre/maplibre-react-native`) menerima
 * `mapStyle?: string | object` sehingga objek biasa ini tetap aman dipakai
 * di kedua platform tanpa anotasi.
 */
export const GAYA_PETA_OSM = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};
