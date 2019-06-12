/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');

const archiver = require('archiver');
const cpy = require('cpy');
const makeDir = require('make-dir');
const bundleBuilder = require('./build-bundle.js');

const sourceDir = __dirname + '/../clients/extension';
const distDir = __dirname + '/../dist/extension';

const manifestVersion = require(`${sourceDir}/manifest.json`).version;

/**
 * Inline the current commit hash in dist folder popup.js
 */
function injectCommitHash() {
  const popupPath = `${distDir}/scripts/popup.js`;
  const modifiedSource = fs.readFileSync(popupPath, {encoding: 'utf8'})
    .replace(/__COMMITHASH__/g, bundleBuilder.COMMIT_HASH);
  fs.writeFileSync(popupPath, modifiedSource);
}

/**
 * @return {Promise<void>}
 */
async function copyAssets() {
  return cpy([
    '*.html',
    'styles/**/*.css',
    'images/**/*',
    'scripts/**/*',
    'manifest.json',
    '_locales/**', // currently non-functional
  ], distDir, {
    cwd: sourceDir,
    parents: true,
  });
}

/**
 * Put built extension into a zip file ready for install or upload to the
 * webstore.
 * @return {Promise<void>}
 */
async function packageExtension() {
  const packagePath = `${distDir}/../extension-package`;
  await makeDir(packagePath);

  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: {level: 9},
    });

    const outPath = `${packagePath}/lighthouse-${manifestVersion}.zip`;
    const writeStream = fs.createWriteStream(outPath);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);

    archive.pipe(writeStream);
    archive.directory(distDir, false);
    archive.finalize();
  });
}

async function run() {
  const argv = process.argv.slice(2);
  if (argv.includes('package')) {
    return packageExtension();
  }
  await copyAssets();
  injectCommitHash();
}

run();
