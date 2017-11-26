// rollup.config.js
import buble from 'rollup-plugin-buble';

export default {
  banner: `// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// This is CodeMirror (http://codemirror.net), a code editor
// implemented in JavaScript on top of the browser's DOM.
//
// You can find some technical background for some of the code below
// at http://marijnhaverbeke.nl/blog/#cm-internals .
`,
  input: "node_modules/codemirror/src/codemirror.js",
  name: "CodeMirror",
  output: {
    format: "iife",
    file: "node_modules/codemirror/lib/codemirror.js",
  },
  plugins: [ buble({namedFunctionExpressions: false}) ]
};
