#!/usr/bin/env node
/**
 * Adapter dari hasil `expo export --platform <platform>` ke format manifest
 * yang server netmanager harapkan.
 *
 * Input:  dist/metadata.json + dist/_expo/static/js/<platform>/*.hbc
 * Output: { id, createdAt, runtimeVersion, launchAsset, assets, metadata, extra }
 *
 * Usage:
 *   node scripts/build-update-manifest.js \
 *     --dist=./dist \
 *     --platform=android \
 *     --runtime-version=1.0.5 \
 *     [--release-notes="Bugfix typo"] \
 *     > manifest.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...rest] = arg.slice(2).split('=');
    args[rawKey] = rest.join('=') || true;
  }
  return args;
}

function sha256OfFile(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function lookupContentType(ext) {
  const map = {
    bundle: 'application/javascript',
    hbc: 'application/javascript',
    js: 'application/javascript',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    json: 'application/json',
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function main() {
  const args = parseArgs(process.argv);
  const distDir = args.dist || './dist';
  const platform = args.platform;
  const runtimeVersion = args['runtime-version'];
  const releaseNotes = args['release-notes'] || null;

  if (!platform || !['android', 'ios'].includes(platform)) {
    console.error('--platform=android|ios wajib');
    process.exit(1);
  }
  if (!runtimeVersion) {
    console.error('--runtime-version wajib');
    process.exit(1);
  }

  const metadataPath = path.join(distDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error(`metadata.json tidak ditemukan di ${distDir}`);
    process.exit(1);
  }
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const platformBundle = metadata.fileMetadata?.[platform];
  if (!platformBundle) {
    console.error(`fileMetadata.${platform} tidak ada di metadata.json`);
    process.exit(1);
  }

  const bundleRelPath = platformBundle.bundle;
  if (!bundleRelPath) {
    console.error(`${platform}.bundle path tidak ada di metadata.json`);
    process.exit(1);
  }
  const bundleAbsPath = path.join(distDir, bundleRelPath);
  const bundleHash = sha256OfFile(bundleAbsPath);

  const assets = (platformBundle.assets || []).map((entry) => {
    const assetAbsPath = path.join(distDir, entry.path);
    const hash = sha256OfFile(assetAbsPath);
    return {
      hash,
      contentType: lookupContentType(entry.ext),
      fileExtension: entry.ext.startsWith('.') ? entry.ext : `.${entry.ext}`,
    };
  });

  const manifest = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    runtimeVersion,
    launchAsset: {
      hash: bundleHash,
      contentType: 'application/javascript',
      fileExtension: '.bundle',
    },
    assets,
    metadata: {},
    extra: {
      releaseNotes,
    },
  };

  process.stdout.write(JSON.stringify(manifest, null, 2));
}

main();
