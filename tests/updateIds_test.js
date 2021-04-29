const { expect } = require("chai");
const path = require("path");
const { updateIds } = require("../updateIds");
const Analyzer = require("../analyzer");
const mock = require("mock-fs");
const fs = require("fs");
const os = require("os");

describe("update ids", function () {
  afterEach(() => mock.restore());

  it("updates ids from server", () => {
    const analyzer = new Analyzer("codeceptjs", "virtual_dir");

    const idMap = {
      tests: {
        "simple test": "@T1d6a52b9",
      },
      suites: {
        "simple suite": "@Sf3d245a7",
      },
    };

    mock({
      virtual_dir: {
        "test.js": `
Feature('simple suite')

Scenario('simple test', async (I, TodosPage) => {
})        
`,
      },
    });

    analyzer.analyze("test.js");

    updateIds(analyzer.rawTests, idMap, "virtual_dir");

    const updatedFile = fs.readFileSync("virtual_dir/test.js").toString();
    expect(updatedFile).to.include(`Feature('simple suite @Sf3d245a7')`);
    expect(updatedFile).to.include(`Scenario('simple test @T1d6a52b9'`);
  });

  it("allows multi-line titles", () => {
    const analyzer = new Analyzer("codeceptjs", "virtual_dir");

    const idMap = {
      tests: {
        "simple test": "@T1d6a52b9",
      },
      suites: {
        "simple suite": "@Sf3d245a7",
      },
    };

    mock({
      virtual_dir: {
        "test.js": `
Feature('simple suite')

Scenario(
  'simple test', 
  async (I, TodosPage) => {
})        
`,
      },
    });

    analyzer.analyze("test.js");

    updateIds(analyzer.rawTests, idMap, "virtual_dir");

    const updatedFile = fs.readFileSync("virtual_dir/test.js").toString();
    expect(updatedFile).to.include(`Feature('simple suite @Sf3d245a7')`);
    expect(updatedFile).to.include(`'simple test @T1d6a52b9'`);
  });  

  it("respects string literals", () => {

    const idMap = {
      tests: {
        "simple test": "@T1d6a52b9",
      },
      suites: {
        "simple suite": "@Sf3d245a7",
      },
    };

    const analyzer = new Analyzer("codeceptjs", "virtual_dir2");
    mock({
      virtual_dir2: {
        "test.js":
          "\nFeature(`simple suite`)\n\nScenario(`simple test`, async ({ I }) => { I.doSomething() });",
      },
    });

    analyzer.analyze("test.js");

    updateIds(analyzer.rawTests, idMap, "virtual_dir2");

    const updatedFile = fs.readFileSync("virtual_dir2/test.js", "utf-8").toString();
    expect(updatedFile).to.include("Feature(`simple suite @Sf3d245a7`)");
    expect(updatedFile).to.include("Scenario(`simple test @T1d6a52b9`");
  });


  it("respects variables in string literals", () => {

    const idMap = {
      tests: {
        "simple  test": "@T1d6a52b9",
      },
      suites: {
        "simple suite": "@Sf3d245a7",
      },
    };

    const analyzer = new Analyzer("codeceptjs", "virtual_dir");
    mock({
      virtual_dir: {
        "test.js":
          "\nFeature(`simple suite`)\nconst data = 1;\nScenario(`simple ${data} test`, async ({ I }) => { I.doSomething() });",
      },
    });

    analyzer.analyze("test.js");

    updateIds(analyzer.rawTests, idMap, "virtual_dir");

    const updatedFile = fs.readFileSync("virtual_dir/test.js", "utf-8").toString();
    expect(updatedFile).to.include("Feature(`simple suite @Sf3d245a7`)");
    expect(updatedFile).to.include("Scenario(`simple ${data} test @T1d6a52b9`");
  });

});
