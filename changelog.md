# 0.4.7

* Fixed `--update-ids` to work on multiple empty JS files

# 0.4.6

* Fixed `--update-ids` to work on empty JS files

# 0.4.5

* Fixed `--update-ids` to handle the same test names from different suites

# 0.4.4

* Fixed `--update-ids` to respect JSON data 
* Fixed `--clean-ids` to respect string literals

# 0.4.3

* Fixed `--update-ids` to respect multi-line titles.
* Fixed `--update-ids` to update data in string literals.

# 0.4.2

* Fixed `--update-ids` to work well for tests & suites with same title
* Fixed `--update-ids` and `--clean-ids` to work with string literals

# 0.4.1

* Added `--clean-ids` option to remove automatically set ids syncing with a project
* Added `--unsafe-clean-ids` option to clean test ids without checking with a project


# 0.4.0

* Added `--sync` option to toggle to process tests synchronously on backend
* `--update-ids` are now executed as a part of import process, so can be used on a fresh new project.
* Added `--no-detach` option to disable marking tests as detached
* Readme updated

# 0.3.19

Added `--update-ids` command to automatically set ids for tests already loaded to project

```
npx check-tests codeceptjs "**.js" --update-ids
```

# 0.3.18

* Added support of `TESTOMATIO_PREPEND_DIR` parameter to import tests into a specific suite:

```
TESTOMATIO_PREPEND_DIR=Automation TESTOMATIO=xxxx npx check-tests codeceptjs "**.js"
```

# 0.3.17

* [CodeceptJS, Mocha, Jest, Jasmine] Added support for template strings in test names
