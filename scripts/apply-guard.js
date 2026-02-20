const fs = require('fs');
const path = require('path');

function injectGuard(filePath, featureName) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already added
  if (content.includes('useFeatureGuard(')) {
    console.log(`Skipping ${filePath}, guard already present`);
    return;
  }

  // 1. Add imports after the last import statement
  const importLines = [
    `import { AppFeature } from '@/constants/features';`,
    `import { useFeatureGuard } from '@/hooks/useFeatureGuard';`
  ].join('\n');

  const lines = content.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, importLines);
  } else {
    lines.unshift(importLines);
  }

  content = lines.join('\n');

  // 2. Add hook inside default function
  const functionMatch = content.match(/export default function\s+\w+\([^)]*\)\s*\{/);
  if (functionMatch) {
    const hookLine = `  useFeatureGuard(AppFeature.${featureName});`;
    const insertIndex = functionMatch.index + functionMatch[0].length;
    content = content.slice(0, insertIndex) + '\n' + hookLine + content.slice(insertIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Injected ${featureName} guard into ${filePath}`);
  } else {
    console.error(`Could not find 'export default function' in ${filePath}`);
  }
}

const basePath = '/Users/rohadimraja/Documents/projek/mobile-netmanager/app/(app)';

injectGuard(path.join(basePath, 'work-order.tsx'), 'WORK_ORDER');
injectGuard(path.join(basePath, 'absensi.tsx'), 'ABSENSI');
injectGuard(path.join(basePath, 'barang/index.tsx'), 'BARANG');
injectGuard(path.join(basePath, 'marketing/canvasing/index.tsx'), 'CANVASING');

