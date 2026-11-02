'use strict';

// metro 0.83 calls image-size 1.x as `imageSize(pathOrBuffer)`. The fixed
// releases (2.0.3+, GHSA-5p2g-fcmc-qvqq and the ICNS loop) only accept bytes,
// so this shim reads paths itself and keeps the 1.x call shape for Metro.
const fs = require('fs');
const { imageSize } = require('image-size-fixed');

/** Returns the dimensions of an image given its path or its bytes. */
function getImageSize(pathOrBytes) {
  const bytes = typeof pathOrBytes === 'string' ? fs.readFileSync(pathOrBytes) : pathOrBytes;
  return imageSize(bytes);
}

module.exports = getImageSize;
module.exports.imageSize = getImageSize;
