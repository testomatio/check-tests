const { expect } = require("chai");
const path = require("path");
const { replaceAtPoint } = require("../lib/utils");


describe("util functions", () => {

  it('#replaceAtPoint', () => {
    subject = replaceAtPoint(`
Feature

Scenario()
`, { line: 4, column: 9}, 'hello');

    expect(subject).to.equal(`
Feature

Scenario(hello)
`)
  });

});