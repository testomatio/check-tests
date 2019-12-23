# 🌀 AutoCheck Tests by Testomatio

> Static Analysis for your JavaScript tests.

This action shows changed tests on each pull request with a complete list of all tests in this project.

### Features

* Analyzes JavaScript test files in Pull Request 
* Uses AST parser to analyze tests
* Detects added, removed, skipped tests
* Fails when finds `.only` exclusive tests
* Adds labels for PR with or witout tests
* Shows expressive report for each PR

### Sample Report

---

🌀 Tests overview by [Testomatio](https://testomat.io)


Found **7** codeceptjs tests in 1 files 
#### ✔️ Added 1 test


```diff
+ @first Create Todos @step:06 @smoke @story:12345: Another test
```



#### ⚠️ Skipped 1 test
```diff
- @first Create Todos @step:06 @smoke @story:12345: Create multiple todo items
```



<details>
  <summary>📑 List all tests</summary>

---


📎 **`@first` Create Todos `@step:06` `@smoke` `@story:12345`**

📝 [todomvc-tests/create-todos_test.js](#)

* [Create a new todo item](#)
* [Another test](#)
* [~~Create multiple todo items~~](#) ⚠️ *skipped*
* [Text input field should be cleared after each item](#)
* [Text input should be trimmed](#)
* [New todos should be added to the bottom of the list](#)
* [Footer should be visible when adding TODOs](#)


</details>



</details>

---

## Usage

Once this action is enabled GitHub a bot will create a comment for each Pull Request with a list of all changed tests. 

This information is useful to:

* track addition and removal of tests
* protect from skipping tests
* protect from using `.only` exclusive tests
* automatically mark PR with `has tests` or `no tests` labels
* review tests on GitHub

## Installation

Check that your project uses one of the following testing frameworks (this list will be extended).

**Supported testing frameworks**

* mocha
* codeceptjs
* cypress.io
* jest

Add this action to your workflow file `.github/workflow/main.yml` and configure.

```yml
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    name: Check Tests
    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 0
    - uses: testomatio/check-tests@master
      with:
        framework: # REQUIRED - testing framework
        tests: # REQUIRED - glob pattern to match test files
        token: ${{ secrets.GITHUB_TOKEN }}
```

> It is important to enable `actions/checkout@v2` step with `fetch-depth: 0` to allow testomatio to compare tests in pull requests with tests in base.

#### Inputs (Configuration) 

* `framework` - *(required)* Test framework to be used. Supported: mocha, codeceptjs'
* `tests` - *(required)* Glob pattern to match tests in a project, example: `tests/**_test.js'`
* `token` - *(should be: `${{ secrets.GITHUB_TOKEN }}`)* GitHub token to post comment with summary to current pull request
* `has-tests-label` - add a label when PR contains new tests. Set `true` or a label name to enable.
* `no-tests-label` - add a label when PR contains no new tests. Set `true` or a label name to enable.

### Examples

#### Mocha 

Mocha tests located in `tests/` directory:

```yml
steps:
  - uses: actions/checkout@v2
    with:
      fetch-depth: 0
  - uses: testomatio/check-tests@master
    with:
      framework: mocha
      tests: tests/**_test.js
      token: ${{ secrets.GITHUB_TOKEN }}
      no-tests-labels: Tests Needed
```

#### Jest 

Jest tests located in `tests/` directory:

```yml
steps:
  - uses: actions/checkout@v2
    with:
      fetch-depth: 0
  - uses: testomatio/check-tests@master
    with:
      framework: jest
      tests: tests/**.spec.js
      token: ${{ secrets.GITHUB_TOKEN }}
      has-tests-label: true
```

#### Cypress.io

Cypress.io tests located in `cypress/integration` directory:

```yml
steps:
  - uses: actions/checkout@v2
    with:
      fetch-depth: 0
  - uses: testomatio/check-tests@master
    with:
      framework: cypress.io
      tests: cypress/integration/**.js
      token: ${{ secrets.GITHUB_TOKEN }}
      has-tests-labels: true
```


#### CodeceptJS

CodeceptJS tests located in `tests` directory:

```yml
steps:
  - uses: actions/checkout@v2
    with:
      fetch-depth: 0
  - uses: testomatio/check-tests@master
    with:
      framework: codeceptjs
      tests: tests/**_test.js
      token: ${{ secrets.GITHUB_TOKEN }}
      has-tests-labels: true      
```

## Limitations

* Can't analyze included tests from external files
* Can't analyze dynamically created tests


## License MIT

Part of [Testomat.io](https://testomat.io)