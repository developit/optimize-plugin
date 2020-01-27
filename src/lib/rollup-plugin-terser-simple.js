import * as terser from 'terser';
import { toBabelMap } from './util';

export default function rollupPluginTerserSimple () {
  return {
    name: 'rollup-plugin-terser-simple',
    renderChunk (source, chunk, options) {
      const { code, map } = terser.minify(source, {
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
