/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  title: 'Redirects HTTP traffic to HTTPS',
  failureTitle: 'Does not redirect HTTP traffic to HTTPS',
  description: 'If you\'ve already set up HTTPS, make sure that you redirect all HTTP ' +
     'traffic to HTTPS. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/http-redirects-to-https).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class RedirectsHTTP extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'redirects-http',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['HTTPRedirect'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    return {
      score: Number(artifacts.HTTPRedirect.value),
    };
  }
}

module.exports = RedirectsHTTP;
module.exports.UIStrings = UIStrings;
