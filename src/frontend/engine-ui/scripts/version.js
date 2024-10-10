const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const versionFilePath = path.join(__dirname, '..', 'src', 'environments', 'version.ts');
const src = `export const appVersion = '${packageJson.version}';\n`;

fs.writeFileSync(versionFilePath, src, { encoding: 'utf8' });

console.log(`Version ${packageJson.version} written to ${versionFilePath}`);
