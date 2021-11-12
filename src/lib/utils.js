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

function getUpdatePoint(path) {
  if (!path) return;
  if (!path.arguments) return;
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

function getCode(source, start, end) {
  if (!start || !end || !source) return '';
  const lines = source.split('\n');
  return lines.slice(start - 1, end).join('\n');
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
};
