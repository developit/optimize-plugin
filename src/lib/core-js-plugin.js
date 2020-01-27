import { visit, builders as t } from 'ast-types';
import MagicString from 'magic-string';

/**
 * This does not yet work.
 * It's also far slower than the CommonJS Plugin, which avoids an AST parse.
 */
export default function coreJsPlugin () {
  const COREJS = require.resolve('core-js/package.json').replace('package.json', '');
  const isCoreJsPath = /(?:^|\/)core-js\/(.+)$/;

  return {
    name: 'core-js',
    resolveId (id) {
      const m = id.match(isCoreJsPath);
      if (m && !/\.js$/.test(id)) {
        // console.log(COREJS + m[1] + '.js');
        return COREJS + m[1] + '.js';
      }
      return null;
    },
    load (id) {
      const m = id.match(isCoreJsPath);
      if (m && id.indexOf('?') === -1) {
        return fs.readFile(COREJS + m[1], 'utf-8');
      }
      return null;
    },
    transform (source, id) {
      if (id === ENTRY) return null;
      const program = this.parse(source);
      const is = (type, node) => node.type === type;
      console.log(id);
      // const specs = [];
      let imports = '';
      let count = 0;
      const s = new MagicString(source);
      visit(program, {
        visitCallExpression (path) {
          const callee = path.node.callee;
          const arg = path.node.arguments[0];
          if (is('Identifier', callee) && path.get('callee').getValueProperty('name') === 'require' && arg && is('Literal', arg)) {
            // console.log('require()');
            const id = `_$IMPORT$_${++count}`;
            // specs.push([id, arg]);
            const specifier = arg.value;
            // console.log(specifier);
            s.overwrite(path.node.start, path.node.end, id);
            let parent = path;
            while ((parent = parent.parentPath)) {
              if (is('Program', parent.node)) {
                imports = `import ${id} from "${specifier}";\n${imports}`;
                // console.log('replaced import');
                parent.unshift(
                  t.importDeclaration(
                    [t.importNamespaceSpecifier(t.identifier(id))],
                    t.literal(specifier)
                  )
                );
                break;
              }
            }
            path.replace(t.identifier(id));
            // path.replace(
            //   t.importDeclaration(
            //     t.importDefaultSpecifier(t.identifier())
            //   )
            // );
          }
          return false;
        }
      });
      // console.log('IMPORTS: \n' + imports);
      s.prepend(imports);
      const code = s.toString();
      // console.log(code);
      return { code, ast: program };
    }
  };
}
