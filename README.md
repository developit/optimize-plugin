# Optimize Plugin for Webpack

Optimize your code for modern browsers while still supporting the other 10%,
increasing your build performance, reducing bundle size and improving output quality.

Put simply: it compiles code faster, better and smaller.

## Features

- Much faster than your current Webpack setup
- Transparently optimizes all of your code
- Automatically optimizes all of your dependencies
- Compiles bundles for modern browsers (90%) and legacy browsers (10%)
- Removes unnecessary polyfills, even when inlined into dependencies
- Builds a highly-optimized automated polyfills bundle

## Install

```sh
npm install --save-dev optimize-plugin
```

## Usage

First, disable any existing configuration you have to Babel, minification, and module/nomodule.

Then, add `OptimizePlugin` to your Webpack plugins Array:

```js
plugins: [
  new OptimizePlugin({
    // any options here
  })
]
```

### Options

| Option | Type | Description
|---|---|---
| `concurrency` | `number\|false` | Maximum number of threads to use. Default: the number of available CPUs. <br>_Pass `false` for single-threaded, sometimes faster for small projects._
| `sourceMap` | `boolean\|false` | Whether or not to produce source maps for the given input. |
| `minify` | `boolean\|false` | Minify using Terser, if turned off only comments will be stripped. |
| `downlevel` | `boolean\|true` | Produces a bundle for `nomodule` browsers. (IE11, ...) |
| `modernize` | `boolean\|true` | Attempt to upgrade ES5 syntax to equivalent modern syntax. |
| `verbose` | `boolean\|false` | Will log performance information and information about polyfills. |
| `polyfillsFilename` | `string\|polyfills.legacy.js` | The name for the chunk containing polyfills for the legacy bundle. |


## How does this work?

Instead of running Babel on each individual source code file in your project, `optimize-plugin`
transforms your entire application's bundled code. This means it can apply optimizations and
transformations not only to your source, but to your dependencies - making polyfill extraction
and reverse transpilation steps far more effective.

This setup also allows `optimize-plugin` to achieve better performance. All work is done in
a background thread pool, and the same AST is re-used for modern and legacy transformations.
Previous solutions for module/nomodule have generally relied running two complete compilation
passes, which incurs enormous overhead since the entire graph is built and traversed multiple
times. With `optimize-plugin`, bundling and transpilation are now a separate concerns: Webpack
handles graph creation and reduction, then passes its bundles to Babel for transpilation.

<img src="https://user-images.githubusercontent.com/105127/74685954-0cd21a80-519e-11ea-99f9-8fa5f3aef1b8.png">

### License

Apache-2.0
