function hasStringOrTemplateArgument(path) {
  return hasStringArgument(path) || hasTemplateArgument(path);
}

function hasStringArgument(path) {
  if (!path.arguments) return false;
  if (!path.arguments.length) return false;
  return path.arguments[0].type === 'StringLiteral' || path.arguments[0].type === 'Literal';
}

function getStringValue(path) {
  if (!path) return;
  if (hasStringArgument(path)) {
    return path.arguments[0].value;
  }
  if (hasTemplateArgument(path)) {
    return getQuasiArgument(path);
  }
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

  const nodes = [...path.arguments[0].expressions, ...path.arguments[0].quasis].sort(
    (a, b) => 1000 * a.loc.start.line + a.loc.start.column - (1000 * b.loc.start.line + b.loc.start.column),
  );

  for (const node of nodes) {
    if (node.type === 'MemberExpression') {
      if (node.property && node.property.type === 'Identifier') {
        quasiValue += '${' + node.property.name + '}'; // eslint-disable-line prefer-template
        continue;
      }
    }
    if (node.type === 'Identifier') {
      quasiValue += '${' + node.name + '}'; // eslint-disable-line prefer-template
      continue;
    }
    if (!node.value) continue;
    if (node.value.raw) quasiValue += node.value.raw;
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

function getUpdatePoint(path) {
  if (!path) return;
  if (!path.arguments) return;
  if (!path.arguments[0].loc) throw new Error('No loc (lines of code)');
  const point = path.arguments[0].loc.end;
  point.column--;
  return point;
}

function getEndLineNumber(path) {
  let line = null;
  if (path.container && path.container.loc && path.container.loc.end) {
    line = path.container.loc.end.line;
  }
  return line;
}

function getCode(source, start, end, isLineNumber = false) {
  if (!start || !end || !source) return '';
  let lines = source.split('\n');

  if (isLineNumber) {
    lines = lines.map((line, index) => `${index + 1}: ${line}`);
  }

  const block = `${lines.slice(start - 1, end).join('\n')}\n\n`;
  return block;
}

function parseComments(source) {
  const comments = {};
  source = `${source}\n✔️`;
  // eslint-disable-next-line no-misleading-character-class
  const commentBlocks = source.match(/(?=<!-- check-tests:\s*).*?([📎|📝|✔️])/gs);
  if (commentBlocks) {
    for (const commentBlock of commentBlocks) {
      const id = commentBlock.match(/(?<=id=).*?(?=\s+-->)/s);
      // eslint-disable-next-line no-misleading-character-class
      const docData = commentBlock.match(/(?<=-->\s*)((.|\n)*)(?=\s*[📎|📝|✔️])/);
      if (id && docData) {
        comments[id] = docData[0].replace('*', '').replace(/\n/g, '');
      }
    }
  }

  return comments;
}

function replaceAtPoint(subject, replaceAt, replaceTo) {
  if (!replaceAt) return subject;
  const lines = subject.split('\n');
  const updateLine = lines[replaceAt.line - 1];
  if (updateLine.includes('|')) {
    lines[replaceAt.line - 1] = updateLine.replace(' |', `${replaceTo} |`);
  } else {
    lines[replaceAt.line - 1] =
      updateLine.substring(0, replaceAt.column) + replaceTo + updateLine.substring(replaceAt.column);
  }
  return lines.join('\n');
}

function cleanAtPoint(subject, replaceAt, cleanSubject) {
  if (!replaceAt) return subject;
  const lines = subject.split('\n');
  lines[replaceAt.line - 1] = lines[replaceAt.line - 1].replace(` ${cleanSubject}`, '');
  return lines.join('\n');
}

const playwright = {
  getTestProps: path => {
    const testProps = { annotations: [], tags: [] };
    const argumentsList = path.parent.expression.arguments;
    if (!argumentsList?.length) return testProps;
    const argumentsWithTags = argumentsList.filter(arg => arg.type === 'ObjectExpression');
    if (!argumentsWithTags.length) return testProps;
    const properties = argumentsWithTags.map(arg => arg.properties);
    if (!properties.length) return testProps;

    const propertiesWithTags = properties.flat().filter(prop => prop.key.name === 'tag');
    const propertiesWithAnnotations = properties.flat().filter(prop => prop.key.name === 'annotation');

    // parse TAGS
    // prop value could be a string or an array of strings
    const tagsList = propertiesWithTags
      .map(prop => {
        if (prop.value.type === 'ArrayExpression') {
          return prop.value.elements.map(el => el.value);
        }
        return prop.value.value;
      })
      // flatten array of arrays
      .flat()
      // remove empty values
      .filter(Boolean);

    // parse ANNOTATIONS

    propertiesWithAnnotations.forEach(prop => {
      // annotations as array: [{type: 'text, description?: 'text'}]
      if (prop.value.type === 'ArrayExpression') {
        const annotationProperties = prop.value.elements.map(el => el.properties);
        annotationProperties.forEach(annotationProp => {
          const annotation = {};
          annotationProp.forEach(prop => {
            annotation[prop.key.name] = prop.value.value;
          });
          testProps.annotations.push(annotation);
        });
        // single annotation: {type: 'text, description?: 'text'}
      } else if (prop.value.type === 'ObjectExpression') {
        const annotation = {};
        prop.value.properties.forEach(prop => {
          annotation[prop.key.name] = prop.value.value;
        });
        testProps.annotations.push(annotation);
      }
    });

    // remove @ at start of each tag
    testProps.tags = tagsList.map(tag => {
      return tag.startsWith('@') ? tag.substring(1) : tag;
    });

    return testProps;
  },
};

const arrayCompare = function (a, b, id) {
  const missing = [];
  const found = [];
  let added = [];

  // If 'a' is an object, extract fields a, b, and id
  if (typeof a === 'object' && !Array.isArray(a)) {
    ({ a, b, id } = a);
  }

  // Create a copy of 'b' for modification
  const bCopy = [...b];

  // Iterate over array 'a' to find matches
  a.forEach(aItem => {
    let bIndex = -1;

    if (id) {
      // If an identifier is specified, find an object with the same 'id'
      bIndex = bCopy.findIndex(bItem => bItem[id] === aItem[id]);
    } else {
      // If no identifier is specified, find an exact match
      bIndex = bCopy.indexOf(aItem);
    }

    if (bIndex !== -1) {
      // Add to 'found' and remove the found element from bCopy
      found.push({
        a: aItem,
        b: bCopy[bIndex],
      });
      bCopy.splice(bIndex, 1); // Remove element from bCopy
    } else {
      // Add to 'missing' if the element is not found
      missing.push({ a: aItem });
    }
  });

  // Everything left in bCopy is added to 'added'
  added = bCopy.map(bItem => ({ b: bItem }));

  return {
    found,
    missing,
    added,
  };
};

const jest = {
  isConcurrentTest: path => {
    return path.property?.name === 'concurrent';
  },
};

module.exports = {
  hasStringArgument,
  hasTemplateQuasi,
  getLineNumber,
  getEndLineNumber,
  getCode,
  jest,
  hasTemplateArgument,
  getQuasiArgument,
  parseComments,
  getStringValue,
  hasStringOrTemplateArgument,
  getUpdatePoint,
  replaceAtPoint,
  cleanAtPoint,
  playwright,
  arrayCompare,
};
