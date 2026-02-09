declare module 'maplibre-gl' {
  export interface MapOptions {
    container: HTMLElement | string;
    style: any;
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
  }

  export interface FlyToOptions {
    center?: [number, number];
    zoom?: number;
    duration?: number;
  }

  export interface FitBoundsOptions {
    padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
    duration?: number;
  }

  export class LngLat {
    lng: number;
    lat: number;
    constructor(lng: number, lat: number);
  }

  export class LngLatBounds {
    constructor(sw?: [number, number], ne?: [number, number]);
    extend(lngLat: [number, number] | LngLat): this;
    getCenter(): LngLat;
    getSouthWest(): LngLat;
    getNorthEast(): LngLat;
  }

  export interface MarkerOptions {
    element?: HTMLElement;
    anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    offset?: [number, number];
    rotation?: number;
    rotationAlignment?: 'map' | 'viewport' | 'auto';
    pitchAlignment?: 'map' | 'viewport' | 'auto';
    scale?: number;
    color?: string;
    draggable?: boolean;
  }

  export class Marker {
    constructor(options?: MarkerOptions);
    setLngLat(lngLat: [number, number] | LngLat): this;
    getLngLat(): LngLat;
    addTo(map: Map): this;
    remove(): this;
    getElement(): HTMLElement;
  }

  export class Map {
    constructor(options: MapOptions);
    on(type: string, listener: (e: any) => void): this;
    off(type: string, listener: (e: any) => void): this;
    getCenter(): LngLat;
    getZoom(): number;
    flyTo(options: FlyToOptions): this;
    fitBounds(bounds: LngLatBounds, options?: FitBoundsOptions): this;
    addSource(id: string, source: any): this;
    addLayer(layer: any): this;
    getSource(id: string): any;
    getLayer(id: string): any;
    removeLayer(id: string): this;
    removeSource(id: string): this;
    remove(): void;
  }
}
