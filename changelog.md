# 0.7.3

- Added QUnit support
- Added `analyzer.addPreset` to include Babel presets
- Added API to import analyzer scripts:

```js
const { Analyzer } = require('check-tests');
// ... see Programmatic API in Readme
```

# 0.7.2

- Added `--create` option to create a test or suite by ID when they are not found in a project

# 0.7.1

- Added support to playwright/test

# 0.7.0

- Parser rewritten to provide complete TypeScript support.
- TypeScript dependencies added
- Fixed breaking types and formatting in `*.ts` files.

# 0.6.1

- [CodecetpJS] Added support for `Data().Scenatio().tag()` structure

# 0.6.0

- Added TypeScript support for `--update-ids`, `--clean-ids`, `--purge` modes
- Added `-p`, `--plugins` to pass in additional babel plugins:

```
npx check-tests ... --plugins "@babel/plugin-proposal-optional-chaining"
```

# 0.5.0

- Added `--keep-structure` option to prefer source code structure over the structure in Testomat.io
- Uses `TESTOMATIO_BRANCH` env variable to import tests to a branch:

```
TESTOMATIO_BRANCH=dev TESTOMATIO=123456 npx check-tests ...
```

- Don't mark tests as "detached" when importing a single file

# 0.4.7

- Fixed `--update-ids` to work on multiple empty JS files

# 0.4.6

- Fixed `--update-ids` to work on empty JS files

# 0.4.5

- Fixed `--update-ids` to handle the same test names from different suites

# 0.4.4

- Fixed `--update-ids` to respect JSON data
- Fixed `--clean-ids` to respect string literals

# 0.4.3

- Fixed `--update-ids` to respect multi-line titles.
- Fixed `--update-ids` to update data in string literals.

# 0.4.2

- Fixed `--update-ids` to work well for tests & suites with same title
- Fixed `--update-ids` and `--clean-ids` to work with string literals

# 0.4.1

- Added `--clean-ids` option to remove automatically set ids syncing with a project
- Added `--unsafe-clean-ids` option to clean test ids without checking with a project

# 0.4.0

- Added `--sync` option to toggle to process tests synchronously on backend
- `--update-ids` are now executed as a part of import process, so can be used on a fresh new project.
- Added `--no-detach` option to disable marking tests as detached
- Readme updated

# 0.3.19

Added `--update-ids` command to automatically set ids for tests already loaded to project

```
npx check-tests codeceptjs "**.js" --update-ids
```

# 0.3.18

- Added support of `TESTOMATIO_PREPEND_DIR` parameter to import tests into a specific suite:

```
TESTOMATIO_PREPEND_DIR=Automation TESTOMATIO=xxxx npx check-tests codeceptjs "**.js"
```

# 0.3.17

- [CodeceptJS, Mocha, Jest, Jasmine] Added support for template strings in test names
