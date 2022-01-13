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

import { promises as fs } from 'fs';
import path from 'path';
import { gzip as gzipSync } from 'zlib';
import util from 'util';
import CleanPlugin from 'clean-webpack-plugin';

export function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const gzip = util.promisify(gzipSync);
const gzipSize = async x => (await gzip(x)).byteLength;

export async function printSizes (assets, name, console) {
  let modernSize = 0;
  let legacySize = 0;
  const prettyBytes = (size) => {
    if (size > 1500) return (size / 1000).toFixed(2) + 'kB';
    return size + 'b';
  };
  const showSize = async (file) => {
    const size = await gzipSize(assets[file]);
    let str = `\n  ${file}: ${prettyBytes(size)}`;
    if (file.match(/.legacy/)) {
      legacySize += size;
    } else {
      modernSize += size;
      const legacyName = file.replace(/\.js$/, '.legacy.js');
      if (assets[legacyName]) str += await showSize(legacyName);
    }
    return str;
  };

  let str = `SIZES${name ? ` for ${name}` : ''}:`;
  for (const i in assets) {
    if (i.match(/.legacy/)) continue;
    str += await showSize(i);
  }
  str += await showSize('polyfills.legacy.js');
  str += `\n> Total: ${prettyBytes(modernSize)} - ${prettyBytes(legacySize - modernSize)} (${Math.round((legacySize - modernSize) / legacySize * 100)}%) smaller in modern browsers.`;
  console.log(str);
}

export function runWebpack (webpack, fixture, { output = {}, plugins = [], module = {}, resolve = {}, ...config } = {}, console) {
  return run(callback => webpack({
    mode: 'production',
    devtool: false,
    context: path.resolve(__dirname, 'fixtures', fixture),
    entry: './entry.js',
    output: {
      publicPath: 'dist/',
      path: path.resolve(__dirname, 'fixtures', fixture, 'dist'),
      ...(output || {})
    },
    module: {
      ...module,
      rules: [].concat(module.rules || [])
    },
    resolve,
    plugins: [
      new CleanPlugin([
        path.resolve(__dirname, 'fixtures', fixture, 'dist', '**')
      ])
    ].concat(plugins || []),
    ...config
  }, callback), console);
}

export function watchWebpack (webpack, fixture, { output, plugins, context, ...config } = {}, console) {
  context = context || path.resolve(__dirname, 'fixtures', fixture);
  const compiler = webpack({
    mode: 'production',
    context,
    entry: './entry.js',
    output: {
      publicPath: 'dist/',
      path: path.resolve(context, 'dist'),
      ...(output || {})
    },
    plugins: plugins || []
  });
  compiler.doRun = () => run(compiler.run.bind(compiler), console);
  return compiler;
}

export async function statsWithAssets (stats) {
  const assets = Object.keys(stats.compilation.assets);
  const basePath = stats.compilation.outputOptions.path;
  const contents = {};

  await Promise.all(assets.map(async (asset) => {
    const assetPath = path.join(basePath, asset);
    const content = await fs.readFile(assetPath, 'utf8');

    contents[asset] = content;
  }));

  stats.assets = contents;
}

function run (runner, console) {
  return new Promise((resolve, reject) => {
    runner(async (err, stats) => {
      if (err) return reject(err);

      await statsWithAssets(stats);

      stats.info = stats.toJson({ assets: true, chunks: true });

      if (stats.hasWarnings()) {
        stats.info.warnings.forEach(warning => {
          console.warn('Webpack warning: ', warning);
        });
        console.warn('\nWebpack build generated ' + stats.info.warnings.length + ' warnings(s), shown above.\n\n');
      }
      if (stats.hasErrors()) {
        return reject(stats.info.errors.join('\n'));
      }
      resolve(stats);
    });
  });
}
