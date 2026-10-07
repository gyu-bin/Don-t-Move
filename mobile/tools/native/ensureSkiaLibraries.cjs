/** Recover skipped Skia postinstall binaries before a native Android build. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const skiaRoot = path.dirname(require.resolve('@shopify/react-native-skia/package.json'));
const binaryPackage = 'react-native-skia-android';
const source = path.join(path.dirname(require.resolve(`${binaryPackage}/package.json`)), 'libs');
const destination = path.join(skiaRoot, 'libs', 'android');
const binaries = fs.readdirSync(source, { recursive: true }).filter(file => file.endsWith('.a'));
if (!binaries.length) throw new Error(`No Android binaries installed in ${binaryPackage}`);

function prepared() {
  return binaries.every(file => {
    const target = path.join(destination, file);
    return fs.existsSync(target) && fs.statSync(target).size === fs.statSync(path.join(source, file)).size;
  });
}

if (prepared()) {
  console.log(`[Skia] Android libraries ready (${binaries.length} files).`);
} else {
  console.log('[Skia] Preparing native libraries with the installed package installer.');
  const result = spawnSync(process.execPath, [path.join(skiaRoot, 'scripts', 'install-libs.js')], {
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  if (!prepared()) throw new Error('Skia installer finished without preparing the required Android libraries.');
}
