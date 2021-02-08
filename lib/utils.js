const hash = require('object-hash');
const fs = require('fs');

function hasStringOrTemplateArgument(path) {
  return hasStringArgument(path) || hasTemplateArgument(path);
}

function hasStringArgument(path) {
  if (!path.arguments) return false;
  if (!path.arguments.length) return false;
  return path.arguments[0].type === 'StringLiteral';
}

function getStringValue(path) {
  if (!path) return;
  if (hasStringArgument(path)) {
    return path.arguments[0].value;
  }
  if (hasTemplateArgument(path)) {
    return getQuasiArgument(path)
  }  
  return;
} 

function hasTemplateArgument(path) {
  if (!path.arguments) return false;
  if (!path.arguments.length) return false;
  return path.arguments[0].type === 'TemplateLiteral';
}

function hasTemplateQuasi(path) {
  if (!path.quasi) return false;
  if (!path.quasi.quasis.length) return false;
  return path.quasi.quasis[0].type === 'TemplateElement';
}

function getQuasiArgument(path) {
  let quasiValue = '';
  for (const quasi of path.arguments[0].quasis) {
    quasiValue += quasi.value.raw;
  }

  return quasiValue;
}

function getLineNumber(path) {
  let line = null;
  if (path.container && path.container.loc && path.container.loc.start) {
    line = path.container.loc.start.line;
  }
  return line;
}


function getEndLineNumber(path) {
  let line = null;
  if (path.container && path.container.loc && path.container.loc.end) {
    line = path.container.loc.end.line;
  }
  return line;
}

function getCode(source, start, end) {
  if (!start || !end || !source) return '';
  let lines = source.split('\n');
  return lines.slice(start-1, end).join('\n');
}

function parseComments(source) {
  const comments = {}
  source = `${source}\n✔️`
  const commentBlocks = source.match(/(?=<!-- check-tests:\s*).*?([📎|📝|✔️])/gs);
  if (commentBlocks) {
    for (const commentBlock of commentBlocks) {
      const id = commentBlock.match(/(?<=id=).*?(?=\s+-->)/s);
      const docData = commentBlock.match(/(?<=-->\s*)((.|\n)*)(?=\s*[📎|📝|✔️])/);
      if (id && docData) {
        comments[id] = docData[0].replace('*','').replace(/\n/g, '');
      }
    }
  }

  return comments;
}

async function updateFiles(testData, testomatioMap, workDir) {
  for (const testArr of testData) {
    const file = `${workDir}/${testArr[0].file}`;
    let fileContent = fs.readFileSync(file, {encoding:'utf8'})
    const suite = testArr[0].suites[0];
    if (testomatioMap.suites[suite] && !suite.includes(testomatioMap.suites[suite])) {
      fileContent = fileContent.replace(suite, `${suite} ${testomatioMap.suites[suite]}`)
    }
    for (const test of testArr) {
      if (testomatioMap.tests[test.name] && !test.name.includes(testomatioMap.tests[test.name])) {
        fileContent = fileContent.replace(test.name, `${test.name} ${testomatioMap.tests[test.name]}`)
      }
    }
    fs.writeFile(file, fileContent, (err) => {
      if (err) throw err;
    });
  }
}

module.exports = { 
  hasStringArgument,
  hasTemplateQuasi,
  getLineNumber,
  getEndLineNumber, 
  getCode, 
  hasTemplateArgument, 
  getQuasiArgument,
  parseComments,
  getStringValue,
  hasStringOrTemplateArgument,
  updateFiles,
}
