const fs = require('fs');
const path = require('path');
const debug = require('debug')('testomatio:pull');

class Pull {
  constructor(reporter, workDir = '.', options = {}) {
    this.reporter = reporter;
    this.workDir = workDir;
    this.dryRun = options.dryRun || false;
  }

  async pullFiles() {
    debug('Pulling files from Testomat.io...');

    try {
      const data = await this.reporter.getFilesFromServer();

      if (!data.files) {
        console.log('No files received from server');
        return [];
      }

      const fileOperations = [];

      for (const [fileName, content] of Object.entries(data.files)) {
        const filePath = path.join(this.workDir, fileName);
        const exists = fs.existsSync(filePath);

        fileOperations.push({
          fileName,
          filePath,
          content,
          exists,
          action: exists ? 'overwrite' : 'create',
        });

        if (this.dryRun) {
          if (exists) {
            console.log(`📝 Would overwrite: ${filePath}`);
            debug(`File already exists: ${filePath}`);
          } else {
            console.log(`📄 Would create: ${filePath}`);
            debug(`Would create file: ${filePath}`);
          }
        } else {
          // Check if file exists
          if (exists) {
            debug(`File already exists: ${filePath}`);
          } else {
            debug(`Creating file: ${filePath}`);
          }

          // Ensure directory exists
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            debug(`Created directory: ${dir}`);
          }

          // Write file content
          fs.writeFileSync(filePath, content, 'utf8');
        }
      }

      if (this.dryRun) {
        console.log(`\n🔍 Dry run complete. ${fileOperations.length} files would be processed.`);
        return [];
      } else {
        const createdFiles = fileOperations.map(op => op.filePath);
        console.log(`✅ Pulled ${createdFiles.length} files from Testomat.io`);
        this.displayFileTree(fileOperations);
        return createdFiles;
      }
    } catch (error) {
      console.error('Error pulling files:', error.message);
      throw error;
    }
  }

  displayFileTree(fileOperations) {
    if (fileOperations.length === 0) return;

    console.log('\nFiles structure:');

    // Build tree structure
    const tree = {};

    for (const op of fileOperations) {
      const relativePath = path.relative(this.workDir, op.filePath);
      const parts = relativePath.split(path.sep);

      let current = tree;

      // Navigate through directories
      for (let i = 0; i < parts.length - 1; i++) {
        const dir = parts[i];
        if (!current[dir]) {
          current[dir] = {};
        }
        current = current[dir];
      }

      // Add file
      const fileName = parts[parts.length - 1];
      current[fileName] = {
        isFile: true,
        action: op.action,
      };
    }

    // Display tree recursively
    this.printTree(tree, '');
  }

  printTree(node, prefix) {
    const entries = Object.keys(node).sort((a, b) => {
      // Directories first, then files
      const aIsFile = node[a].isFile;
      const bIsFile = node[b].isFile;
      if (aIsFile !== bIsFile) {
        return aIsFile ? 1 : -1;
      }
      return a.localeCompare(b);
    });

    entries.forEach((name, index) => {
      const isLast = index === entries.length - 1;
      const item = node[name];

      if (item.isFile) {
        // File
        const connector = isLast ? '└── ' : '├── ';
        console.log(`${prefix}${connector}${name}`);
      } else {
        // Directory
        const connector = isLast ? '└── ' : '├── ';
        console.log(`${prefix}${connector}${name}/`);

        // Recurse into directory
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        this.printTree(item, newPrefix);
      }
    });
  }
}

module.exports = Pull;
