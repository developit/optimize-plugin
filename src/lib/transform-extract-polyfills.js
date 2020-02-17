export default function () {
  return {
    name: 'transform-extract-polyfills',
    visitor: {
      ImportDeclaration (path, state) {
        state.opts.onPolyfill(path.node.source.value);
        path.remove();
      }
    }
  };
}
