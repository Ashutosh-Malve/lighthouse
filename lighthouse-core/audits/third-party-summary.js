/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const thirdPartyWeb = require('third-party-web/httparchive-nostats-subset');

const Audit = require('./audit.js');
const BootupTime = require('./bootup-time.js');
const i18n = require('../lib/i18n/i18n.js');
const NetworkRecords = require('../computed/network-records.js');
const MainThreadTasks = require('../computed/main-thread-tasks.js');

const UIStrings = {
  /** Title of a Lighthouse audit that identifies the code on the page that the user doesn't control. This is shown in a list of audits that Lighthouse generates. */
  title: 'Third-Party Usage',
  /** Description of a Lighthouse audit that identifies the code on the page that the user doesn't control. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Third-party code can significantly impact load performance. ' +
    'Limit the number of redundant third-party providers and only load third-party code after ' +
    'your page has primarily finished loading. [Learn more](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/loading-third-party-javascript/).',
  /** Label for a table column that displays how much time each row spent executing on the main thread, entries will be the number of milliseconds spent. */
  columnMainThreadTime: 'Main Thread Time',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/** @typedef {import("third-party-web").IEntity} ThirdPartyEntity */

class ThirdPartySummary extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'third-party-summary',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * `third-party-web` throws when the passed in string doesn't appear to have any domain whatsoever.
   * We pass in some not-so-url-like things, so make the dependent-code simpler by making this call safe.
   * @param {string} url
   * @return {ThirdPartyEntity|undefined}
   */
  static getEntitySafe(url) {
    try {
      return thirdPartyWeb.getEntity(url);
    } catch (_) {
      return undefined;
    }
  }


  /**
   *
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {Array<LH.Artifacts.TaskNode>} mainThreadTasks
   * @param {number} cpuMultiplier
   * @return {Map<ThirdPartyEntity, {mainThreadTime: number, transferSize: number}>}
   */
  static getSummaryByEntity(networkRecords, mainThreadTasks, cpuMultiplier) {
    /** @type {Map<ThirdPartyEntity, {mainThreadTime: number, transferSize: number}>} */
    const entities = new Map();

    for (const request of networkRecords) {
      const entity = ThirdPartySummary.getEntitySafe(request.url);
      if (!entity) continue;

      const entityStats = entities.get(entity) || {mainThreadTime: 0, transferSize: 0};
      entityStats.transferSize += request.transferSize;
      entities.set(entity, entityStats);
    }

    const jsURLs = BootupTime.getJavaScriptURLs(networkRecords);

    for (const task of mainThreadTasks) {
      const attributeableURL = BootupTime.getAttributableURLForTask(task, jsURLs);
      const entity = ThirdPartySummary.getEntitySafe(attributeableURL);
      if (!entity) continue;

      const entityStats = entities.get(entity) || {mainThreadTime: 0, transferSize: 0};
      entityStats.mainThreadTime += task.selfTime * cpuMultiplier;
      entities.set(entity, entityStats);
    }

    return entities;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings || {};
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const tasks = await MainThreadTasks.request(trace, context);
    const multiplier = settings.throttlingMethod === 'simulate' ?
      settings.throttling.cpuSlowdownMultiplier : 1;

    const summaryByEntity = ThirdPartySummary.getSummaryByEntity(networkRecords, tasks, multiplier);

    const summary = {wastedBytes: 0, wastedMs: 0};

    // Sort by a combined measure of bytes + main thread time.
    // 1KB ~= 1 ms
    /** @param {{transferSize: number, mainThreadTime: number}} stats */
    const computeSortValue = stats => stats.transferSize / 1024 + stats.mainThreadTime;

    const results = Array.from(summaryByEntity.entries())
      .map(([entity, stats]) => {
        summary.wastedBytes += stats.transferSize;
        summary.wastedMs += stats.mainThreadTime;

        return {
          entity: /** @type {LH.Audit.Details.LinkValue} */ ({
            type: 'link',
            text: entity.name,
            url: entity.homepage || '',
          }),
          transferSize: stats.transferSize,
          mainThreadTime: stats.mainThreadTime,
        };
      })
      .sort((a, b) => computeSortValue(b) - computeSortValue(a));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'entity', itemType: 'link', text: str_(i18n.UIStrings.columnURL)},
      {key: 'transferSize', granularity: 1, itemType: 'bytes',
        text: str_(i18n.UIStrings.columnSize)},
      {key: 'mainThreadTime', granularity: 1, itemType: 'ms',
        text: str_(UIStrings.columnMainThreadTime)},
    ];

    return {
      score: Number(results.length === 0),
      details: Audit.makeTableDetails(headings, results, summary),
    };
  }
}

module.exports = ThirdPartySummary;
module.exports.UIStrings = UIStrings;
