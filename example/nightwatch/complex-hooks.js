// Complex Nightwatch test with comprehensive hooks (classical format)
module.exports = {
  '@tags': ['complex', 'hooks'],

  // Global setup
  before: function (browser) {
    console.log('Global setup: Starting test suite');
    browser.url('https://example.com');
  },

  beforeEach: function (browser) {
    console.log('Global beforeEach: Preparing for test');
    browser.maximizeWindow().clearCookies();
  },

  afterEach: function (browser) {
    console.log('Global afterEach: Cleaning up after test');
    browser.saveScreenshot('./screenshots/' + this.currentTest.name + '.png');
  },

  after: function (browser) {
    console.log('Global teardown: Test suite completed');
    browser.end();
  },

  // Authentication tests
  'Valid login test': function (browser) {
    browser
      .url('https://example.com/login')
      .clearValue('#username')
      .clearValue('#password')
      .setValue('#username', 'testuser')
      .setValue('#password', 'testpass')
      .click('#login-button')
      .waitForElementVisible('.welcome-message', 5000)
      .assert.containsText('.welcome-message', 'Welcome');
  },

  'Invalid login test': function (browser) {
    browser
      .url('https://example.com/login')
      .clearValue('#username')
      .clearValue('#password')
      .setValue('#username', 'wronguser')
      .setValue('#password', 'wrongpass')
      .click('#login-button')
      .waitForElementVisible('.error-message', 5000)
      .assert.containsText('.error-message', 'Invalid credentials');
  },

  'Empty login fields validation': function (browser) {
    browser
      .url('https://example.com/login')
      .clearValue('#username')
      .clearValue('#password')
      .click('#login-button')
      .assert.visible('.validation-error')
      .assert.containsText('.validation-error', 'Username is required');
  },

  // Navigation tests
  'Main menu navigation test': function (browser) {
    browser
      .url('https://example.com/dashboard')
      .click('.menu-item[data-target="home"]')
      .assert.urlContains('/home')
      .click('.menu-item[data-target="profile"]')
      .assert.urlContains('/profile')
      .click('.menu-item[data-target="settings"]')
      .assert.urlContains('/settings');
  },

  'Breadcrumb navigation test': function (browser) {
    browser
      .url('https://example.com/dashboard')
      .click('.breadcrumb-item:nth-child(1)')
      .assert.urlEquals('https://example.com/dashboard')
      .assert.visible('.breadcrumb-current')
      .assert.containsText('.breadcrumb-current', 'Dashboard');
  },

  'Footer links navigation test': function (browser) {
    browser
      .url('https://example.com/dashboard')
      .scrollTo('.footer')
      .click('.footer-link[href="/about"]')
      .assert.urlContains('/about')
      .assert.containsText('h1', 'About Us');
  },

  // Form tests
  'Contact form submission test': function (browser) {
    browser
      .url('https://example.com/contact')
      .waitForElementVisible('form', 2000)
      .setValue('#name', 'John Doe')
      .setValue('#email', 'john@example.com')
      .setValue('#subject', 'Test Subject')
      .setValue('#message', 'This is a test message')
      .click('#submit-button')
      .waitForElementVisible('.success-message', 5000)
      .assert.containsText('.success-message', 'Message sent successfully');
  },

  'Form validation error test': function (browser) {
    browser
      .url('https://example.com/contact')
      .waitForElementVisible('form', 2000)
      .setValue('#email', 'invalid-email')
      .click('#submit-button')
      .assert.visible('.field-error')
      .assert.containsText('.field-error', 'Please enter a valid email');
  },

  'Required form fields test': function (browser) {
    browser
      .url('https://example.com/contact')
      .waitForElementVisible('form', 2000)
      .click('#submit-button')
      .assert.elementCount('.required-error', 3)
      .assert.containsText('.required-error:first-child', 'Name is required');
  },
};
