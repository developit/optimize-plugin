/**
 * Copyright 2020 Google LLC
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
import { webpacks } from './_webpacks';
import { runWebpack, printSizes } from './_util';

jest.setTimeout(30000);

// easier for debugging
const concurrency = false;

describe('optimize-plugin', () => {
  const $console = {
    log: console.log,
    warn: console.warn,
    info: console.info
  };

  beforeAll(() => {
    console.warn = () => 0;
    console.log = () => 0;
    console.info = () => 0;
  });

  afterAll(() => {
    console.warn = $console.warn;
    console.log = $console.log;
    console.info = $console.info;
  });

  describe.each(webpacks)('webpack %i', (_, webpack, tsLoader) => {
    test('exports a class', () => {
      expect(OptimizePlugin).toBeInstanceOf(Function);
      expect(OptimizePlugin.prototype).toHaveProperty('apply', expect.any(Function));
    });

    test('it works', async () => {
      const stats = await runWebpack(webpack, 'basic', {
        module: {
          rules: [
            {
              test: /\.jsx?$/,
              loader: resolve(__dirname, '_sucrase-loader.js')
            }
          ]
        },
        plugins: [
          new OptimizePlugin({ concurrency }, webpack)
        ]
      }, $console);

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

      await printSizes(stats.assets, '"it works"', $console);
    });

    test('code splitting', async () => {
      const stats = await runWebpack(webpack, 'code-splitting', {
        output: {
          chunkFilename: '[name].js'
        },
        plugins: [
          new OptimizePlugin({ concurrency }, webpack)
        ]
      }, $console);

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

      await printSizes(stats.assets, 'code splitting', $console);
    });

    describe('TypeScript Support', () => {
      test('using ts-loader', async () => {
        const stats = await runWebpack(webpack, 'typescript', {
          resolve: {
            extensions: ['.ts', '.js']
          },
          module: {
            rules: [
              {
                test: /\.tsx?$/,
                loader: tsLoader,
                options: {
                  transpileOnly: true
                }
              }
            ]
          },
          plugins: [
            new OptimizePlugin({ concurrency }, webpack)
          ]
        }, $console);

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

        await printSizes(stats.assets, 'typescript support', $console);
      });

      test('using Sucrase', async () => {
        const stats = await runWebpack(webpack, 'typescript', {
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
            new OptimizePlugin({ concurrency }, webpack)
          ]
        }, $console);

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

        await printSizes(stats.assets, 'sucrase', $console);
      });
    });
  });
});
