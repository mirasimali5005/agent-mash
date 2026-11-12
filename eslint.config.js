// Static analysis for the browser code. no-unsanitized flags any HTML sink that isn't the
// audited setHTML() helper; the core rules forbid eval-like code and javascript: URLs.
const nounsanitized = require('eslint-plugin-no-unsanitized');
const globals = require('globals');

module.exports = [
  {
    files: ['app.js', 'theme.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...globals.browser } },
    plugins: { 'no-unsanitized': nounsanitized },
    rules: {
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-proto': 'error',
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  },
];
