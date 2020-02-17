const path = require('path');
const { transform } = require('sucrase');

module.exports = function (source) {
  const name = path.relative(process.cwd(), this.resource);
  const isTs = /\.tsx?$/.test(name);
  const start = Date.now();
  const { code } = transform(source, {
    transforms: isTs ? ['typescript', 'jsx'] : ['jsx'],
    production: true
  });
  console.log((Date.now() - start) + 'ms: ' + name);
  return code;
};
