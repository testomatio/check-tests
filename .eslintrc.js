module.exports = {
  extends: ['eslint:recommended', 'prettier'],
  ignorePatterns: ['example/**/*.js', 'dist/'],
  env: {
    node: true,
    es6: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    'no-useless-escape': 0,
  },
};
