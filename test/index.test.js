/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import OptimizePlugin from '..';
import { runWebpack, watchWebpack, statsWithAssets, sleep } from './_util';

jest.setTimeout(30000);

describe('optimize-plugin', () => {
  test('exports a class', () => {
    expect(OptimizePlugin).toBeInstanceOf(Function);
    const inst = new OptimizePlugin();
    expect(inst).toBeInstanceOf(OptimizePlugin);
    expect(inst).toHaveProperty('apply', expect.any(Function));
  });

  test('it works', async () => {
    const stats = await runWebpack('basic', {
      plugins: [
        new OptimizePlugin()
      ]
    });

    const assetNames = Object.keys(stats.assets);
    expect(assetNames).toHaveLength(3);

    expect(assetNames).toContain('main.js');
    expect(assetNames).toContain('main.legacy.js');
    expect(assetNames).toContain('polyfills.legacy.js');

    const main = stats.assets['main.js'];
    expect(main).toMatch(/hello world/g);

    const legacy = stats.assets['main.legacy.js'];
    expect(legacy).toMatch(/hello world/g);

    const polyfills = stats.assets['polyfills.legacy.js'];
    expect(polyfills).toMatch(/Object\.defineProperty/g);
    expect(polyfills).not.toMatch(/require\(/g);
  });
});
