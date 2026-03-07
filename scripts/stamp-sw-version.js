/**
 * Stamps a unique build version into public/sw.js
 * so the browser detects a new service worker on each deployment.
 *
 * Called automatically by the "prebuild" npm script.
 */
const fs = require('fs');
const path = require('path');

const SW_PATH = path.join(__dirname, '..', 'public', 'sw.js');
const version = Date.now().toString();

let content = fs.readFileSync(SW_PATH, 'utf8');
content = content.replace(
  /const SW_VERSION = '[^']*'/,
  `const SW_VERSION = '${version}'`
);
fs.writeFileSync(SW_PATH, content);

console.log(`[stamp-sw-version] SW_VERSION set to ${version}`);
