# Optimize Plugin for Webpack

Optimize your code for modern browsers while still supporting the other 10%, increasing your build performance, reducing bundle size and improving output quality.

Put simply: it compiles code faster, better and smaller.

### Features

- Much faster than your current Webpack setup
- Transparently optimizes all of your code
- Automatically optimizes all of your dependencies
- Compiles bundles for modern browsers (90%) and legacy browsers (10%)
- Removes unnecessary polyfills, even when inlined into dependencies
- Compiles a highly-optimized dedicated polyfills bundle

```js
plugins: [
  new OptimizePlugin({
    // options
  })
]
```
