import * as terser from 'terser';
import babel from '@babel/core';
import modernPreset from '@babel/preset-modules';
import transformWebpackUrls from './lib/transform-change-webpack-urls';
import extractPolyfills from './lib/transform-extract-polyfills';
import { toBabelMap, toTerserMap, createPerformanceTimings } from './lib/util';

const NAME = 'OptimizePlugin';

const TERSER_CACHE = {};

const noopTimings = { timings: [], start: n => {}, end: n => {} };

export async function process ({ file, source, map, options = {} }) {
  const { minify, downlevel } = options;
  const { timings, start, end } = options.timings ? createPerformanceTimings() : noopTimings;

  const polyfills = new Set();
  let legacy;

  const outputOptions = {
    compact: minify,
    minified: minify,
    comments: minify ? false : undefined,
    generatorOpts: {
      concise: true
    }
  };

  start('modern');
  const modern = await babel.transformAsync(source, {
    configFile: false,
    babelrc: false,
    filename: file,
    inputSourceMap: map,
    sourceMaps: true,
    sourceFileName: file,
    sourceType: 'module',
    envName: 'modern',
    ast: false,
    presets: [
      [modernPreset, {
        loose: true
      }]
    ],
    ...outputOptions,
    caller: {
      supportsStaticESM: true,
      name: NAME + '-modern'
    }
  });
  end('modern');

  if (minify) {
    start('modern-minify');
    const minified = terser.minify(modern.code, {
      ecma: 8,
      module: false,
      nameCache: TERSER_CACHE,
      sourceMap: {
        content: toTerserMap(modern.map)
      },
      compress: {
        global_defs: {
          MODERN_MODE: true,
          'process.env.NODE_ENV': global.process.env.NODE_ENV || 'production'
        }
      },
      mangle: {
        safari10: true
      }
    });

    modern.code = minified.code;
    modern.map = toBabelMap(minified.map);

    // @todo this means modern.ast is now out-of-sync with modern.code
    // can this work? or do we need to run Terser separately for modern/legacy?
    end('modern-minify');
  }

  if (downlevel) {
    start('legacy');
    // TODO: I think we need to perform this on source
    legacy = await babel.transformAsync(modern.code, {
      configFile: false,
      babelrc: false,
      filename: file,
      inputSourceMap: modern.map,
      sourceMaps: true,
      sourceFileName: file,
      sourceType: 'module',
      envName: 'legacy',
      presets: [
        ['@babel/preset-env', {
          loose: true,
          modules: false,
          // corejs: 3,
          corejs: options.corejsVersion,
          useBuiltIns: 'usage'
        }]
      ],
      plugins: [
        [transformWebpackUrls, {
          pattern: /\.js$/,
          replacement: '.legacy.js'
        }],
        [extractPolyfills, {
          onPolyfill (specifier) {
            polyfills.add(specifier);
          }
        }]
      ],
      ...outputOptions,
      caller: {
        supportsStaticESM: false,
        name: NAME + '-legacy'
      }
    });

    // TODO: I think we need to add a minify step here.
    end('legacy');
  }

  return {
    modern: sanitizeResult(modern),
    legacy: legacy && sanitizeResult(legacy),
    polyfills: Array.from(polyfills),
    timings
  };
}

function sanitizeResult (result) {
  return { source: result.code, map: result.map };
}
