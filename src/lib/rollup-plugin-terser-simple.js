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

import * as terser from 'terser';
import { toBabelMap } from './util';

export default function rollupPluginTerserSimple () {
  return {
    name: 'rollup-plugin-terser-simple',
    async renderChunk (source, chunk, options) {
      const { code, map } = await terser.minify(source, {
        compress: {
          global_defs: {
            'typeof self': '"object"',
            'globalThis': 'undefined'
          },
          pure_getters: true,
          unsafe: true
        },
        mangle: true,
        toplevel: true,
        sourceMap: options.sourcemap && {
          filename: chunk.fileName
        }
      });
      return {
        code,
        map: toBabelMap(map)
      };
    }
  };
}
