// Classic Nightwatch test with CommonJS syntax
module.exports = {
  // Global settings for the test suite
  '@tags': ['smoke', 'regression'],

  // Global hooks
  before: function (browser) {
    console.log('Setting up...');
    browser.url('https://www.google.com');
  },

  beforeEach: function (browser) {
    browser.maximizeWindow();
  },

  after: function (browser) {
    console.log('Cleaning up...');
    browser.end();
  },

  afterEach: function (browser) {
    browser.saveScreenshot('./screenshots/test.png');
  },

  // Test cases using classic Nightwatch syntax
  'Google homepage should load': function (browser) {
    browser
      .waitForElementVisible('body', 1000)
      .assert.title('Google')
      .assert.visible('input[name="q"]')
      .assert.containsText('title', 'Google');
  },

  'Search functionality should work': function (browser) {
    browser
      .setValue('input[name="q"]', 'nightwatch')
      .click('input[name="btnK"]')
      .pause(1000)
      .assert.containsText('#search', 'nightwatch')
      .assert.urlContains('search?q=nightwatch');
  },

  'Advanced search should be accessible': function (browser) {
    browser
      .url('https://www.google.com')
      .waitForElementVisible('input[name="q"]', 1000)
      .click('a[href*="advanced_search"]')
      .assert.urlContains('advanced_search')
      .assert.visible('input[name="as_q"]');
  },

  // Test with custom commands
  'Custom command test': function (browser) {
    browser
      .url('https://www.google.com')
      .perform(function () {
        console.log('Performing custom action');
      })
      .execute(
        function () {
          return document.title;
        },
        function (result) {
          browser.assert.equal(result.value, 'Google');
        },
      );
  },

  // Test with page object pattern reference
  'Page object style test': function (browser) {
    const searchPage = browser.page.googleSearch();
    searchPage.navigate().searchFor('nightwatch.js').assert.containsText('@searchResults', 'nightwatch');
  },

  // Test with client assertions
  'Client assertions test': function (browser) {
    browser
      .url('https://www.google.com')
      .waitForElementVisible('body', 1000)
      .getText('title', function (result) {
        this.assert.equal(result.value, 'Google');
      })
      .getCssProperty('body', 'background-color', function (result) {
        this.assert.equal(result.value, 'rgba(255, 255, 255, 1)');
      });
  },

  // Test with conditional logic
  'Conditional test': function (browser) {
    browser
      .url('https://www.google.com')
      .waitForElementVisible('body', 1000)
      .element('css selector', '#gb_70', function (result) {
        if (result.status !== -1) {
          browser.click('#gb_70');
        } else {
          browser.assert.ok(true, 'Sign in link not found, continuing...');
        }
      });
  },

  // Test with multiple assertions
  'Multiple assertions test': function (browser) {
    browser
      .url('https://www.google.com')
      .waitForElementVisible('body', 1000)
      .assert.title('Google')
      .assert.visible('input[name="q"]')
      .assert.visible('input[name="btnK"]')
      .assert.attributeEquals('input[name="q"]', 'type', 'text')
      .assert.cssProperty('body', 'margin', '0px');
  },
};
