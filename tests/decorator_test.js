const Decorator = require('../decorator');
const { expect } = require('chai');

describe('Decorator', () => {

  it('should print markdown', () => {
    const decorator = new Decorator([
      { name: 'test1', suites: ['Appium', 'first', 'second'] },
      { name: 'test2', suites: ['Appium', 'first', 'second'] },
      { name: 'test3', suites: ['Appium'] },
      { name: 'test4', suites: ['Appium', 'third', 'fourth'] },
      { name: 'test5', suites: ['WebDriverIO'] },
      { name: 'test6', suites: ['Puppeteer', 'first', 'second', 'third'] },
    ]);
    expect(decorator.getMarkdownList()).to.include.members([
      '* 📎 **Appium**',
      '  * 📎 **first**',
      '    * 📎 **second**',
      '      * `test1`',
      '      * `test2`',
      '  * `test3`',
      '  * 📎 **third**',
      '    * 📎 **fourth**',
      '      * `test4`',
      '* 📎 **WebDriverIO**',
      '  * `test5`',
      '* 📎 **Puppeteer**',
      '  * 📎 **first**',
      '    * 📎 **second**',
      '      * 📎 **third**',
      '        * `test6`'      
    ]);
  });

  it('should print markdown2', () => {
    const decorator = new Decorator([
      { name: 'should send basic', suites: ['GraphQL', 'basic queries'] },
      { name: 'should send mut 1', suites: ['GraphQL', 'basic mutations'] },
      { name: 'should send mut 2', suites: ['GraphQL', 'basic mutations'] },
    ]);

    expect(decorator.getMarkdownList()).to.include.members([
      '* 📎 **GraphQL**',
      '  * 📎 **basic queries**',
      '    * `should send basic`',
      '  * 📎 **basic mutations**',
      '    * `should send mut 1`',
      '    * `should send mut 2`'       
    ]);
  });  


});