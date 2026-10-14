// Nightwatch test with page objects pattern
const HomePage = require('../pages/HomePage');
const SearchPage = require('../pages/SearchPage');

module.exports = {
  '@tags': ['page-objects', 'e2e'],

  before: function (browser) {
    browser.globals.homePage = new HomePage(browser);
    browser.globals.searchPage = new SearchPage(browser);
  },

  'Home page navigation test': function (browser) {
    const homePage = browser.globals.homePage;

    homePage
      .navigate()
      .waitForElementVisible('@searchBox', 5000)
      .assert.title('Google')
      .assert.visible('@searchBox')
      .assert.visible('@searchButton');
  },

  'Search workflow test': function (browser) {
    const homePage = browser.globals.homePage;
    const searchPage = browser.globals.searchPage;

    homePage.navigate().search('nightwatch.js');

    searchPage.waitForResults().assert.containsText('@resultsContainer', 'nightwatch').verifyResultsCount(10);
  },

  'Advanced search features': function (browser) {
    const homePage = browser.globals.homePage;

    homePage
      .navigate()
      .clickAdvancedSearch()
      .fillAdvancedSearchForm({
        allWords: 'nightwatch testing',
        exactPhrase: 'end to end',
        anyWords: 'selenium webdriver',
        noneWords: 'cucumber',
      })
      .submitAdvancedSearch();

    browser.assert.urlContains('search').assert.containsText('#search', 'nightwatch testing');
  },

  'Mobile responsive test': function (browser) {
    const homePage = browser.globals.homePage;

    browser.resizeWindow(375, 667); // iPhone 6/7/8 size

    homePage.navigate().assert.visible('@mobileMenu').assert.cssProperty('@searchBox', 'width', '100%');

    browser.resizeWindow(1920, 1080); // Desktop size
  },

  'Multi-language support test': function (browser) {
    const homePage = browser.globals.homePage;

    homePage
      .navigate()
      .changeLanguage('es')
      .assert.containsText('@searchButton', 'Buscar')
      .changeLanguage('en')
      .assert.containsText('@searchButton', 'Search');
  },

  after: function (browser) {
    browser.end();
  },
};
