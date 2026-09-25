module.exports = {
  'Google title test': function (browser) {
    browser.url('https://google.com/ncr').assert.titleEquals('Google');
  },

  'Google search test': function (browser) {
    browser
      .setValue('textarea[name=q]', 'nightwatchjs')
      .waitForElementVisible('#main')
      .assert.textContains('#main', 'Nightwatch.js');
  },

  beforeEach: function (browser) {
    browser.maximizeWindow();
  },
};
