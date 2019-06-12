/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// const VIEWER_ORIGIN = 'https://googlechrome.github.io';
const VIEWER_ORIGIN = 'http://localhost:8000';
// const VIEWER_PATH = '/lighthouse/viewer/';
const VIEWER_PATH = '/';

/**
 * @param {LH.Result} lhr 
 */
function openTabAndSendJsonReport(lhr) {
  // This doesn't work...
  /* in manifest ...
  "externally_connectable": {
    "matches": [
      "https://googlechrome.github.io/*",
      "http://localhost:8000/*"
    ]
  }
  */
  /* in lighthouse viewer ....
    // If the page was opened as a popup, tell the opening context we're ready.
    // Use the Chrome API if the opener was the Lighthouse extension.
    // Otherwise, use the normal Web API.
    if (self.document.location.search === '?utm_source=extension') {
      // const lighthouseExtensionId = 'bjfihnioigpgonfmnnmbfolancgipojh';
      // change to w/e the development id is
      const lighthouseExtensionId = 'deffdbidhacfibodnagjdgalamignndb'
      const port = chrome.runtime.connect(lighthouseExtensionId);
      port.onMessage.addListener(function(message) {
        console.log(message);
      });
    } else if (self.opener && !self.opener.closed) {
      self.opener.postMessage({opened: true}, '*');
    }
  */
  // chrome.runtime.onConnectExternal.addListener(function msgHandler(port) {
  //   if (!port.sender || !port.sender.url
  //     || new URL(port.sender.url).origin !== VIEWER_ORIGIN) {
  //     return;
  //   }
  //   port.postMessage(lhr);
  //   port.disconnect();
  //   chrome.runtime.onConnectExternal.removeListener(msgHandler);
  // });

  // The popup's window.name is keyed by version+url+fetchTime, so we reuse/select tabs correctly
  // @ts-ignore - If this is a v2 LHR, use old `generatedTime`.
  // const fallbackFetchTime = /** @type {string} */ (lhr.generatedTime);
  // const fetchTime = lhr.fetchTime || fallbackFetchTime;
  // const windowName = `${lhr.lighthouseVersion}-${lhr.requestedUrl}-${fetchTime}`;
  // window.open(`${VIEWER_ORIGIN}${VIEWER_PATH}?utm_source=extension`, windowName);
  
  chrome.tabs.create({
    url: `${VIEWER_ORIGIN}${VIEWER_PATH}?utm_source=extension`,
    active: true,
  }, (tab) => {
    const tabId = tab.id;
    if (!tabId) {
      return;
    }

    chrome.tabs.sendMessage(tabId, lhr);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  // Export for importing types into popup.js and require()ing into unit tests.
  module.exports = {
    openTabAndSendJsonReport,
  };
}

// Expose on window for extension (popup.js), other browser-residing consumers of file.
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.openTabAndSendJsonReport = openTabAndSendJsonReport;
}
