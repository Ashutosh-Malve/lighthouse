/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('../../../lighthouse-core/lib/lh-error.js')} LighthouseError */

/**
 * Error strings that indicate a problem in how Lighthouse was run, not in
 * Lighthouse itself, mapped to more useful strings to report to the user.
 */
const NON_BUG_ERROR_MESSAGES = {
  'DNS_FAILURE': 'DNS servers could not resolve the provided domain.',
  'INVALID_URL': 'Lighthouse can only audit URLs that start' +
      ' with http:// or https://.',

  // chrome extension API errors
  'multiple tabs': 'You probably have multiple tabs open to the same origin. ' +
      'Close the other tabs to use Lighthouse.',
  // The extension debugger API is forbidden from attaching to the web store.
  // @see https://chromium.googlesource.com/chromium/src/+/5d1f214db0f7996f3c17cd87093d439ce4c7f8f1/chrome/common/extensions/chrome_extensions_client.cc#232
  'The extensions gallery cannot be scripted': 'The Lighthouse extension cannot audit the ' +
      'Chrome Web Store. If necessary, use the Lighthouse CLI to do so.',
  'Cannot access a chrome': 'The Lighthouse extension cannot audit ' +
      'Chrome-specific urls. If necessary, use the Lighthouse CLI to do so.',
  'Cannot access contents of the page': 'Lighthouse can only audit URLs that start' +
      ' with http:// or https://.',
};

/** @type {?string} */
let siteURL = null;
/** @type {boolean} */
let isRunning = false;

function getLighthouseVersion() {
  return chrome.runtime.getManifest().version;
}

function getLighthouseCommitHash() {
  return '__COMMITHASH__';
}

function getChromeVersion() {
  // @ts-ignore
  return /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1];
}

/**
 * Guaranteed context.querySelector. Always returns an element or throws if
 * nothing matches query.
 * @param {string} query
 * @param {ParentNode=} context
 * @return {HTMLElement}
 */
function find(query, context = document) {
  /** @type {?HTMLElement} */
  const result = context.querySelector(query);
  if (result === null) {
    throw new Error(`query ${query} not found`);
  }
  return result;
}

/**
 * @param {string} message
 * @param {Error} err
 * @return {HTMLButtonElement}
 */
function buildErrorCopyButton(message, err) {
  const issueBody = `
**Lighthouse Version**: ${getLighthouseVersion()}
**Lighthouse Commit**: ${getLighthouseCommitHash()}
**Chrome Version**: ${getChromeVersion()}
**Initial URL**: ${siteURL}
**Error Message**: ${message}
**Stack Trace**:
\`\`\`
${err.stack}
\`\`\`
    `;

  const errorButtonDefaultText = 'Copy details to clipboard 📋';
  const errorButtonEl = document.createElement('button');
  errorButtonEl.className = 'button button--report-error';
  errorButtonEl.textContent = errorButtonDefaultText;

  errorButtonEl.addEventListener('click', async () => {
    // @ts-ignore - tsc doesn't include `clipboard` on `navigator`
    await navigator.clipboard.writeText(issueBody);
    errorButtonEl.textContent = 'Copied to clipboard 📋';

    // Return button to inviting state after timeout.
    setTimeout(() => {
      errorButtonEl.textContent = errorButtonDefaultText;
    }, 1000);
  });

  return errorButtonEl;
}

/**
 * @param {[string, string, string]} status
 */
function logStatus([, message, details]) {
  if (typeof details === 'string' && details.length > 110) {
    // Grab 100 characters and up to the next comma, ellipsis for the rest
    const hundredPlusChars = details.replace(/(.{100}.*?),.*/, '$1…');
    details = hundredPlusChars;
  }
  find('.status__msg').textContent = message;
  const statusDetailsMessageEl = find('.status__detailsmsg');
  statusDetailsMessageEl.textContent = details;
}

/**
 * Click event handler for Generate Report button.
 * @param {string} siteURL
 */
async function onGenerateReportButtonClick(siteURL) {
  if (isRunning) {
    return;
  }
  isRunning = true;

  // resetting status message
  const statusMsg = find('.status__msg');
  statusMsg.textContent = 'Starting...';

  // TODO get LHR from PSI.
  console.log(siteURL);

  isRunning = false;
}

/**
 * Initializes the popup's state and UI elements.
 */
async function initPopup() {
  chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      return;
    }

    siteURL = tabs[0].url || null;
    // Show the user what URL is going to be tested.
    find('header h2').textContent = siteURL ? new URL(siteURL).origin : '';
  });

  // bind Generate Report button
  const generateReportButton = find('#generate-report');
  generateReportButton.addEventListener('click', () => {
    if (siteURL) {
      onGenerateReportButtonClick(siteURL);
    }
  });
}

initPopup();
