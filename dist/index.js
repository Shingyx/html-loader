'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = loader;

var _options = require('./options.json');

var _options2 = _interopRequireDefault(_options);

var _loaderUtils = require('loader-utils');

var _schemaUtils = require('schema-utils');

var _schemaUtils2 = _interopRequireDefault(_schemaUtils);

var _posthtml = require('posthtml');

var _posthtml2 = _interopRequireDefault(_posthtml);

var _esm = require('@posthtml/esm');

var _htmlnano = require('htmlnano');

var _htmlnano2 = _interopRequireDefault(_htmlnano);

var _Error = require('./Error');

var _Error2 = _interopRequireDefault(_Error);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Loader Defaults
const defaults = {
  url: true,
  import: true,
  minimize: false,
  template: false
}; /* eslint-disable
     import/order,
     import/first,
     no-shadow,
     no-param-reassign
   */
function loader(html, map, meta) {
  // Loader Options
  const options = Object.assign({}, defaults, (0, _loaderUtils.getOptions)(this));

  (0, _schemaUtils2.default)(_options2.default, options, 'HTML Loader');
  // Make the loader async
  const cb = this.async();
  const file = this.resourcePath;

  options.template = options.template ? typeof options.template === 'string' ? options.template : '_' : false;

  const plugins = [];

  // HTML URL Plugin
  if (options.url) {
    plugins.push((0, _esm.urls)(options));
  }

  // HTML IMPORT Plugin
  if (options.import) {
    plugins.push((0, _esm.imports)(options));
  }

  // TODO(michael-ciniawsky)
  // <imports src=""./file.html"> aren't minified (options.template) (#160)
  if (options.minimize) {
    plugins.push((0, _htmlnano2.default)({ collapseWhitespace: 'all' }));
  }

  // Reuse HTML AST (PostHTML AST)
  // (e.g posthtml-loader) to avoid HTML reparsing
  if (meta) {
    if (meta.ast && meta.ast.type === 'posthtml') {
      const { ast } = meta.ast;

      html = ast.root;
    }
  }

  (0, _posthtml2.default)(plugins).process(html, { from: file, to: file }).then(({ html, messages }) => {
    if (meta && meta.messages) {
      messages = messages.concat(meta.messages);
    }

    const imports = messages.filter(msg => msg.type === 'import' ? msg : false).reduce((imports, msg) => {
      try {
        msg = typeof msg.import === 'function' ? msg.import() : msg.import;

        imports += msg;
      } catch (err) {
        // TODO(michael-ciniawsky)
        // revisit HTMLImportError
        this.emitError(err);
      }

      return imports;
    }, '');

    const exports = messages.filter(msg => msg.type === 'export' ? msg : false).reduce((exports, msg) => {
      try {
        msg = typeof msg.export === 'function' ? msg.import() : msg.import;

        exports += msg;
      } catch (err) {
        // TODO(michael-ciniawsky)
        // revisit HTMLExportError
        this.emitError(err);
      }

      return exports;
    }, '');

    // TODO(michael-ciniawsky)
    // HACK Ensure to cleanup/reset messages between files
    // @see https://github.com/posthtml/posthtml/pull/250
    messages.length = 0;

    html = options.template ? `function (${options.template}) { return \`${html}\`; }` : `\`${html}\``;

    const result = [imports ? `// HTML Imports\n${imports}\n` : false, exports ? `// HTML Exports\n${exports}\n` : false, `// HTML\nexport default ${html}`].filter(Boolean).join('\n');

    cb(null, result);

    return null;
  }).catch(err => {
    cb(new _Error2.default(err));

    return null;
  });
}