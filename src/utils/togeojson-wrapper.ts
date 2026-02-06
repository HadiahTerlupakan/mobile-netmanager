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

/**
 * @types/togeojson is not available, using require and declaring a basic type
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const toGeoJSON = require('togeojson') as {
  kml: (doc: Document) => GeoJSON.FeatureCollection;
  gpx: (doc: Document) => GeoJSON.FeatureCollection;
};

export default toGeoJSON;
