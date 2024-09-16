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
    /* prettier-ignore */
    lines[replaceAt.line - 1] = updateLine.substring(0, replaceAt.column) + replaceTo + updateLine.substring(replaceAt.column);
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
  getTestTags: path => {
    const argumentsList = path.parent.expression.arguments;
    if (!argumentsList?.length) return [];
    const argumentsWithTags = argumentsList.filter(arg => arg.type === 'ObjectExpression');
    if (!argumentsWithTags.length) return [];
    const properties = argumentsWithTags.map(arg => arg.properties);
    if (!properties.length) return [];
    const propertiesWithTags = properties.flat().filter(prop => prop.key.name === 'tag');
    if (!propertiesWithTags.length) return [];

    // prop value could be a string or an array of strings
    let tags = propertiesWithTags
      .map(prop => {
        if (prop.value.type === 'ArrayExpression') {
          return prop.value.elements.map(el => el.value);
        }
        return prop.value.value;
      })
      .flat();
    // remove @ at start of each tag
    tags = tags.map(tag => {
      return tag.startsWith('@') ? tag.substring(1) : tag;
    });

    return tags;
  },
};

const arrayCompare = function (a, b, id) {
  const missing = [];
  const found = [];
  let added = [];

  // Якщо 'a' є об'єктом, беремо відповідні поля
  if (R.is(Object, a)) {
    ({ a, b, id } = a);
  }

  // Копія 'b' для модифікації
  let bCopy = R.clone(b);

  // Перебір по масиву 'a' для пошуку співпадінь
  R.forEach(aItem => {
    let bIndex = -1;

    if (id) {
      // Якщо надано ідентифікатор, шукаємо об'єкт з таким самим 'id'
      bIndex = R.findIndex(R.propEq(id, aItem[id]), bCopy);
    } else {
      // Якщо ідентифікатор не надано, шукаємо пряме співпадіння
      bIndex = R.indexOf(aItem, bCopy);
    }

    if (bIndex !== -1) {
      // Додаємо до 'found' і видаляємо знайдений елемент з bCopy
      found.push({
        a: aItem,
        b: bCopy[bIndex],
      });
      bCopy = R.remove(bIndex, 1, bCopy);
    } else {
      // Додаємо до 'missing', якщо не знайдено
      missing.push({ a: aItem });
    }
  }, a);

  // Все, що залишилося в bCopy, додається в 'added'
  added = R.map(bItem => ({ b: bItem }), bCopy);

  return {
    found,
    missing,
    added,
  };
};

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
  getUpdatePoint,
  replaceAtPoint,
  cleanAtPoint,
  playwright,
  arrayCompare,
};
