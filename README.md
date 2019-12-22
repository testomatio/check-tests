# 🌀 AutoCheck Tests by Testomatio

This action shows changed tests on each pull request with a complete list of all tests in this project.


### Sample Report

---

🌀 Tests overview from [Testomatio](https://testomat.io)


Found **17** mocha tests in 2 files 

```diff
Added tests
===========
+ Math: should test if 3*3 = 9
+ Math: should be clone
```



<details>
  <summary>📑 List all tests</summary>


##### Actions 📎 *example/mocha/cypress_spec.js*
* `.type() - type into a DOM element`
* `.focus() - focus on a DOM element`
* `.blur() - blur off a DOM element`
* `.clear() - clears an input or textarea element`
* `.submit() - submit a form`
* `.click() - click on a DOM element`
* `.dblclick() - double click on a DOM element`
* `.rightclick() - right click on a DOM element`
* `.check() - check a checkbox or radio element`
* `.uncheck() - uncheck a checkbox element`
* `.select() - select an option in a <select> element`
* `.scrollIntoView() - scroll an element into view`
* `.trigger() - trigger an event on a DOM element`
* `cy.scrollTo() - scroll the window or element to a position`

##### Math 📎 *example/mocha/index_test.js*
* `should test if 3*3 = 9`
* `should test (3-4)*8 SHOULD EQUAL -8`
* `should be clone`

</details>

---

## Usage

Once this action is enabled GitHub a bot will create a comment for each Pull Request with a list of all changed tests. 

This inforamation is useful to:

* track addition and removal of your tests
* see overview of all tests in a project
* manage tests within GitHub

## Installation

Check that your project uses one of the following testing frameworks (this list will be extended).

**Supported testing frameworks**

* mocha
* codeceptjs
* cypress.io

Add this action to your workflow and configure:

### Example usage

#### Mocha 

Mocha tests located in `tests/` directory:

```yml
uses: testomatio/check-tests
with:
  framework: mocha
  tests: tests/**_test.js
  token: ${{ secrets.GITHUB_TOKEN }}
```

#### Cypress.io

Cypress.io tests located in `cypress/integration` directory:

```yml
uses: testomatio/check-tests
with:
  framework: cypress.io
  tests: cypress/integration/**.js
  token: ${{ secrets.GITHUB_TOKEN }}
```


#### CodeceptJS

CodeceptJS tests located in `tests` directory:

```yml
uses: testomatio/check-tests
with:
  framework: codeceptjs
  tests: tests/**_test.js
  token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

* `framework` - *(required)* Test framework to be used. Supported: mocha, codeceptjs'
* `tests` - *(required)* Glob pattern to match tests in a project, example: `tests/**_test.js'`
* `branch` - *(default: master)* Main branch to compare tests with. 
* `token` - *(should be: `${{ secrets.GITHUB_TOKEN }}`)* GitHub token to post comment with summary to current pull request
    required: false



## License MIT

Part of [Testomat.io](https://testomat.io)