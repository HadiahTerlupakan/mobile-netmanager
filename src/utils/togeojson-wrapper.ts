import { gpx, kml } from '@tmcw/togeojson';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

// Polyfills for togeojson
interface GlobalWithPolyfills {
  DOMParser?: typeof DOMParser;
  XMLSerializer?: typeof XMLSerializer;
}

const globalWithPolyfills = global as unknown as GlobalWithPolyfills;

if (!globalWithPolyfills.DOMParser) {
  globalWithPolyfills.DOMParser = DOMParser;
}
if (!globalWithPolyfills.XMLSerializer) {
  globalWithPolyfills.XMLSerializer = XMLSerializer;
}

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: {
      type: string;
      coordinates: number[] | number[][] | number[][][];
    };
  }[];
};
const rawToGeoJSON = {
  kml,
  gpx,
} as const;

const toGeoJSON = rawToGeoJSON as unknown as {
  kml: (doc: Document) => GeoJSONFeatureCollection;
  gpx: (doc: Document) => GeoJSONFeatureCollection;
};

export default toGeoJSON;
