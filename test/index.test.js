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
import OptimizePlugin from '..';
import { runWebpack, printSizes } from './_util';

jest.setTimeout(30000);

// easier for debugging
const concurrency = false;

describe('optimize-plugin', () => {
  test('exports a class', () => {
    expect(OptimizePlugin).toBeInstanceOf(Function);
    expect(OptimizePlugin.prototype).toHaveProperty('apply', expect.any(Function));
  });

  test('it works', async () => {
    const stats = await runWebpack('basic', {
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            loader: resolve(__dirname, '_sucrase-loader.js')
          }
        ]
      },
      plugins: [
        new OptimizePlugin({ concurrency })
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

    await printSizes(stats.assets, '"it works"');
  });

  test('code splitting', async () => {
    const stats = await runWebpack('code-splitting', {
      output: {
        chunkFilename: '[name].js'
      },
      plugins: [
        new OptimizePlugin({ concurrency })
      ]
    });

    const assetNames = Object.keys(stats.assets);
    expect(assetNames).toHaveLength(9);

    expect(assetNames).toContain('main.js');
    expect(assetNames).toContain('main.legacy.js');
    expect(assetNames).toContain('home.js');
    expect(assetNames).toContain('home.legacy.js');
    expect(assetNames).toContain('about.js');
    expect(assetNames).toContain('about.legacy.js');
    expect(assetNames).toContain('profile.js');
    expect(assetNames).toContain('profile.legacy.js');
    expect(assetNames).toContain('polyfills.legacy.js');

    const main = stats.assets['main.js'];
    expect(main).toMatch(/hello world/g);

    const legacy = stats.assets['main.legacy.js'];
    expect(legacy).toMatch(/hello world/g);

    const polyfills = stats.assets['polyfills.legacy.js'];
    expect(polyfills).toMatch(/Object\.defineProperty/g);
    expect(polyfills).not.toMatch(/require\(/g);

    await printSizes(stats.assets, 'code splitting');
  });

  describe('TypeScript Support', () => {
    test('using ts-loader', async () => {
      const stats = await runWebpack('typescript', {
        resolve: {
          extensions: ['.ts', '.js']
        },
        module: {
          rules: [
            {
              test: /\.tsx?$/,
              loader: 'ts-loader',
              options: {
                transpileOnly: true
              }
            }
          ]
        },
        plugins: [
          new OptimizePlugin({ concurrency })
        ]
      });

      const assetNames = Object.keys(stats.assets);
      expect(assetNames).toHaveLength(3);

      expect(assetNames).toContain('main.js');
      expect(assetNames).toContain('main.legacy.js');
      expect(assetNames).toContain('polyfills.legacy.js');

      const main = stats.assets['main.js'];
      expect(main).toMatch(/pinch-zoom/g);

      const legacy = stats.assets['main.legacy.js'];
      expect(legacy).toMatch(/pinch-zoom/g);

      const polyfills = stats.assets['polyfills.legacy.js'];
      expect(polyfills).toMatch(/Object\.defineProperty/g);
      expect(polyfills).not.toMatch(/require\(/g);

      await printSizes(stats.assets, 'typescript support');
    });

    test('using Sucrase', async () => {
      const stats = await runWebpack('typescript', {
        resolve: {
          extensions: ['.ts', '.js']
        },
        module: {
          rules: [
            {
              test: /\.tsx?$/,
              loader: resolve(__dirname, '_sucrase-loader.js')
            }
          ]
        },
        plugins: [
          new OptimizePlugin({ concurrency })
        ]
      });

      const assetNames = Object.keys(stats.assets);
      expect(assetNames).toHaveLength(3);

      expect(assetNames).toContain('main.js');
      expect(assetNames).toContain('main.legacy.js');
      expect(assetNames).toContain('polyfills.legacy.js');

      const main = stats.assets['main.js'];
      expect(main).toMatch(/pinch-zoom/g);

      const legacy = stats.assets['main.legacy.js'];
      expect(legacy).toMatch(/pinch-zoom/g);

      const polyfills = stats.assets['polyfills.legacy.js'];
      expect(polyfills).toMatch(/Object\.defineProperty/g);
      expect(polyfills).not.toMatch(/require\(/g);

      await printSizes(stats.assets, 'sucrase');
    });
  });
});
