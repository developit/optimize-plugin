/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Convert a Babel-style SourceMap to Terser-style, parsing if necessary.
 * @param {(import('@babel/core').BabelFileResult)['map']|string|null} map
 * @return {import('source-map').RawSourceMap|null} map
 * @todo This should be deleted, as it's exclusively to make TypeScript happy.
 */
export function toTerserMap (map) {
  if (typeof map === 'string') map = JSON.parse(map);
  return typeof map === 'object' && map ? {
    ...map,
    version: String(map.version)
  } : null;
}

/**
 * Convert a Terser-style SourceMap to Babel-style, parsing if necessary.
 * @param {import('source-map').RawSourceMap|string|null} map
 * @returns {(import('@babel/core').BabelFileResult)['map']|null}
 * @todo This should be deleted, as it's exclusively to make TypeScript happy.
 */
export function toBabelMap (map) {
  if (typeof map === 'string') map = JSON.parse(map);
  return typeof map === 'object' && map ? {
    file: '',
    ...map,
    version: parseInt(map.version, 10)
  } : null;
}

const DEFAULT_COREJS_VERSION = 2;

let corejsVersion;

/**
 * Get the user's installed version of core-js
 * @returns {number}
 */
export function getCorejsVersion () {
  if (!corejsVersion) {
    try {
      // @ts-ignore
      corejsVersion = parseInt(require('core-js/package.json').version, 10);
      console.log(`[OptimizePlugin] Detected core-js version ${corejsVersion}`);
    } catch (e) {
      console.warn(
        `[OptimizePlugin] Unable to detect installed version of core-js. Assuming core-js@${DEFAULT_COREJS_VERSION}.`
      );
      corejsVersion = DEFAULT_COREJS_VERSION;
    }
  }
  return corejsVersion;
}

export function createPerformanceTimings () {
  const timings = [];

  const start = name => {
    timings.push({ name, start: Date.now() });
  };

  const end = name => {
    for (const entry of timings) {
      if (entry.name === name) {
        entry.end = Date.now();
        entry.duration = entry.end - entry.start;
        return;
      }
    }
  };

  return {
    timings,
    start,
    end
  };
}
