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
