import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

// Polyfills for togeojson
const globalAny: any = global;
if (!globalAny.DOMParser) {
  globalAny.DOMParser = DOMParser;
}
if (!globalAny.XMLSerializer) {
  globalAny.XMLSerializer = XMLSerializer;
}

// @ts-ignore
const toGeoJSON = require('togeojson');

export default toGeoJSON;
