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

/**
 * Detects and analyzes a Webpack "entry" bundle, allowing String transformations on its internal chunk URL map.
 *
 * @example
 * {
 *   plugins: [
 *     ['./transform-change-webpack-urls', {
 *       pattern: /\.js$/,
 *       replacement: '.legacy.js'
 *     }]
 *   ]
 * }
 *
 * @see https://astexplorer.net/#/gist/0995f8452cfa62d797a2a778a3442b65/2e588cc89829971495ca8e38905bb5581a23cf5d
 */

/** @typedef NodePath @type {import('@babel/core').NodePath} */

export default function ({ types: t }) {
  function unwrap (path) {
    if (t.isExpressionStatement(path)) {
      return unwrap(path.get('expression'));
    }
    if (t.isUnaryExpression(path) && path.node.operator === '!') {
      return unwrap(path.get('argument'));
    }
    return path;
  }

  /**
   * Attempt to parse a path and find a webpack Bootstrap function, if so returning a description.
   * @param {NodePath} path
   */
  function getWebpackBootstrap (path) {
    path = unwrap(path);
    if (!t.isCallExpression(path)) return false;
    const factory = path.get('callee');
    if (!t.isFunctionExpression(factory)) return false;
    const bootstrap = parseWebpackBootstrap(factory);
    if (!bootstrap || !bootstrap.confident) return false;
    const args = path.get('arguments');
    bootstrap.modules = getWebpackModules(args);
    return bootstrap;
  }

  /**
   * Verify that a Path is a "bootstrap" function, which is Webpack's module registry and loader implementation.
   * @param {NodePath} path
   */
  function parseWebpackBootstrap (path) {
    const bootstrap = {
      confident: false,
      /** @type {NodePath} */
      factory: null,
      /** @type {NodePath} */
      urlMap: null
    };

    // // TODO: this is silly and should use binding lookup + parent checks. Something like:
    // const bindings = path.get('body').scope.bindings;
    // console.log(path.get('body').scope.hasGlobal('window'));
    // for (let name in bindings) {
    //   const binding = bindings[name];
    //   if (1){}
    // }
    // bindings.some(b => {
    //   b.referencePaths.some(p => t.isMemberExpression(p.parent) && t.isAssignmentExpression(p.parentPath.parent) && p.parent.property.name === 'oe')
    // });

    const identifiers = {};
    path.get('body').traverse({
      MemberExpression (p) {
        // Find the script loader function (indicated by the presence of document.createElement("script").
        // Note that this check *does* traverse into nested functions.
        if (t.matchesPattern(p.node, 'document.createElement') && t.isCallExpression(p.parent) && t.isStringLiteral(p.parent.arguments[0], { value: 'script' })) {
          const id = p.parentPath.parent.id.name;
          p.scope.getBinding(id).referencePaths.forEach(p => {
            // Find script.src= assignment mapping:
            const parent = p.parentPath;
            if (t.isMemberExpression(parent) && t.isIdentifier(parent.node.property, { name: 'src' }) && t.isAssignmentExpression(parent.parent)) {
              // Find the assigned value: s.src = X
              let expr = parent.parentPath.get('right').resolve();
              // It might be a function call:
              if (t.isCallExpression(expr)) {
                expr = expr.get('callee').resolve();
              }
              // That function call might be an IIFE (it generally is):
              if (t.isFunction(expr)) {
                expr = expr.get('body.body').filter(t.isReturnStatement)[0];
                if (expr) expr = expr.get('argument');
              }
              // Store it for later manipulation
              bootstrap.urlMap = expr;
            }
          });
          return;
        }

        // Detect extensions to Webpack's main namespace.
        // They're assignments to properties on a local binding, but we don't yet know which one.
        // We ignore nested functions, and only look at assignments.
        if (p.scope !== path.scope || !t.isAssignmentExpression(p.parent)) {
          return;
        }
        if (t.isIdentifier(p.node.object) && t.isIdentifier(p.node.property)) {
          let a = identifiers[p.node.object.name];
          if (!a) a = identifiers[p.node.object.name] = {};
          a[p.node.property.name] = p;
        }
      }
    });
    // shallowWalk(path.get('body'), p => {
    //  if (!t.isMemberExpression(p)) return;
    //  if (t.isIdentifier(p.node.object) && t.isIdentifier(p.node.property)) {
    //    let a = identifiers[p.node.object.name];
    //    if (!a) a = identifiers[p.node.object.name] = {};
    //    a[p.node.property.name] = true;
    //  }
    // });

    // Check if we found a binding with properties that signify a Webpack namespace object:
    for (const a in identifiers) {
      const v = identifiers[a];
      // Look for `__webpack_public_path__`, `__webpack_modules__` and an onerror handler:
      if (v.p && v.c && v.oe) {
        bootstrap.confident = true;
        bootstrap.factory = path;
        // might be useful later
        bootstrap.api = v;
        break;
      }
    }

    // Regardless of structure, a `window.webpackJsonp` reference means this is a webpack bootstrap function:
    if (identifiers.window && identifiers.window.webpackJsonp) {
      bootstrap.confident = true;
      bootstrap.factory = path;
      bootstrap.webpackJsonp = identifiers.window.webpackJsonp;
    }

    return bootstrap;
  }

  function getWebpackModules (list) {
    const modules = [];
    const mod = m => {
      if (t.isFunctionExpression(m)) {
        modules.push(m);
      } else {
        throw Error('Not a webpack bundle');
      }
    };
    list.forEach(m => {
      if (t.isArrayExpression(m)) {
        m.get('elements').forEach(mod);
      } else {
        mod(m);
      }
    });
    return modules;
  }

  // function shallowWalk(path, callback) {
  //   if (Array.isArray(path)) {
  //     for (let i=0; i<path.length; i++) shallowWalk(path[i], callback);
  //   }
  //   else if (t.isVariableDeclaration(path)) {
  //     shallowWalk(path.get('declarations'), callback);
  //   }
  //   else if (t.isVariableDeclarator(path)) {
  //     shallowWalk(path.get('id'), callback);
  //     shallowWalk(path.get('init'), callback);
  //   }
  //   else if (t.isBlockStatement(path)) {
  //     shallowWalk(path.get('body'), callback);
  //   }
  //   else if (t.isExpressionStatement(path)) {
  //     shallowWalk(path.get('expression'), callback);
  //   }
  //   else if (t.isAssignmentExpression(path)) {
  //     shallowWalk(path.get('left'), callback);
  //     shallowWalk(path.get('right'), callback);
  //   }
  //   else if (t.isSequenceExpression(path)) {
  //     shallowWalk(path.get('expressions'), callback);
  //   }
  //   else if (t.isUnaryExpression(path)) {
  //     shallowWalk(path.get('argument'), callback);
  //   }
  //   else if (!t.isFunction(path)) {
  //     callback(path);
  //   }
  // }

  return {
    name: 'transform-change-webpack-urls',
    visitor: {
      Program (path, state) {
        const opts = state.opts || {};
        const pattern = opts.pattern || /\.js$/;
        const replacement = opts.replacement || '.modern.js';

        path.get('body').forEach(expr => {
          const bootstrap = getWebpackBootstrap(expr);
          if (!bootstrap) return;

          // Replace the template part containing ".js" with ".module.js"
          if (bootstrap.urlMap) {
            bootstrap.urlMap.traverse({
              StringLiteral (s) {
                if (/\.js$/.test(s.node.value)) {
                  s.replaceWith(t.stringLiteral(s.node.value.replace(pattern, replacement)));
                  s.stop();
                }
              }
            });
          }
        });
      }
    }
  };
}
