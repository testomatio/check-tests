const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { updateIdsGauge, cleanIdsGauge } = require('../src/updateIds/updateIds-gauge');

describe('Gauge update-ids', () => {
  const tempDir = path.join(__dirname, 'temp-gauge-update');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('updateIdsGauge', () => {
    it('adds suite IDs to specification titles', () => {
      const specContent = `# User Management

## Create User
* Open user form
* Fill user data`;

      const testomatioMap = {
        suites: {
          [`${tempDir}/test.spec#User Management`]: '@S12345678',
        },
        tests: {},
      };

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = updateIdsGauge(testomatioMap, tempDir, { pattern: '**/*.spec' });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('# User Management @S12345678');
    });

    it('adds test IDs to scenario titles', () => {
      const specContent = `# User Management

## Create User
* Open user form
* Fill user data

## Update User
* Open user form
* Update user data`;

      const testomatioMap = {
        suites: {},
        tests: {
          [`${tempDir}/test.spec#User Management#Create User`]: '@T87654321',
          [`${tempDir}/test.spec#User Management#Update User`]: '@T12345679',
        },
      };

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = updateIdsGauge(testomatioMap, tempDir, { pattern: '**/*.spec' });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('## Create User @T87654321');
      expect(updatedContent).to.include('## Update User @T12345679');
    });

    it('handles underlined specification titles', () => {
      const specContent = `User Management
===============

## Create User
* Open user form`;

      const testomatioMap = {
        suites: {
          [`${tempDir}/test.spec#User Management`]: '@S11111111',
        },
        tests: {
          [`${tempDir}/test.spec#User Management#Create User`]: '@T22222222',
        },
      };

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = updateIdsGauge(testomatioMap, tempDir, { pattern: '**/*.spec' });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('User Management @S11111111');
    });

    it('handles underlined scenario titles', () => {
      const specContent = `# User Management

Create User
-----------
* Open user form

Update User
-----------
* Update user form`;

      const testomatioMap = {
        suites: {},
        tests: {
          [`${tempDir}/test.spec#User Management#Create User`]: '@T33333333',
          [`${tempDir}/test.spec#User Management#Update User`]: '@T44444444',
        },
      };

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = updateIdsGauge(testomatioMap, tempDir, { pattern: '**/*.spec' });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('Create User @T33333333');
      expect(updatedContent).to.include('Update User @T44444444');
    });

    it('prevents duplicate ID addition', () => {
      const specContent = `# User Management @S12345678

## Create User @T87654321
* Open user form

## Update User
* Open user form`;

      const testomatioMap = {
        suites: {
          [`${tempDir}/test.spec#User Management`]: '@S12345678',
        },
        tests: {
          [`${tempDir}/test.spec#User Management#Create User`]: '@T87654321',
          [`${tempDir}/test.spec#User Management#Update User`]: '@T12345679',
        },
      };

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = updateIdsGauge(testomatioMap, tempDir, { pattern: '**/*.spec' });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('# User Management @S12345678');
      expect(updatedContent).to.include('## Create User @T87654321');
      expect(updatedContent).to.include('## Update User @T12345679');
    });

    it('handles simple key matching', () => {
      const specContent = `# User Management

## Create User
* Open user form`;

      const testomatioMap = {
        suites: {
          'User Management': '@S55555555',
        },
        tests: {
          'Create User': '@T66666666',
        },
      };

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = updateIdsGauge(testomatioMap, tempDir, { pattern: '**/*.spec' });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('# User Management @S55555555');
      expect(updatedContent).to.include('## Create User @T66666666');
    });

    it('handles tags in titles', () => {
      const specContent = `# User Management @tag1 @tag2

## Create User @smoke @regression
* Open user form`;

      const testomatioMap = {
        suites: {
          [`${tempDir}/test.spec#User Management`]: '@S77777777',
        },
        tests: {
          [`${tempDir}/test.spec#User Management#Create User`]: '@T88888888',
        },
      };

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = updateIdsGauge(testomatioMap, tempDir, { pattern: '**/*.spec' });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('# User Management @tag1 @tag2 @S77777777');
      expect(updatedContent).to.include('## Create User @smoke @regression @T88888888');
    });
  });

  describe('cleanIdsGauge', () => {
    it('removes specific suite and test IDs', () => {
      const specContent = `# User Management @S12345678

## Create User @T87654321
* Open user form`;

      const testomatioMap = {
        suites: {
          [`${tempDir}/test.spec#User Management`]: '@S12345678',
        },
        tests: {
          [`${tempDir}/test.spec#User Management#Create User`]: '@T87654321',
        },
      };

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = cleanIdsGauge(testomatioMap, tempDir, { pattern: '**/*.spec' });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('# User Management');
      expect(updatedContent).not.to.include('@S12345678');
      expect(updatedContent).to.include('## Create User');
      expect(updatedContent).not.to.include('@T87654321');
    });

    it('removes all IDs in dangerous mode', () => {
      const specContent = `# User Management @S12345678 @S99999999

## Create User @T87654321 @T11111111
* Open user form`;

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = cleanIdsGauge({}, tempDir, {
        pattern: '**/*.spec',
        dangerous: true,
      });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('# User Management');
      expect(updatedContent).not.to.match(/@S\d+/);
      expect(updatedContent).to.include('## Create User');
      expect(updatedContent).not.to.match(/@T\d+/);
    });

    it('handles underlined format cleaning', () => {
      const specContent = `User Management @S12345678
===============

Create User @T87654321
-----------
* Open user form`;

      const testomatioMap = {
        suites: {
          [`${tempDir}/test.spec#User Management`]: '@S12345678',
        },
        tests: {
          [`${tempDir}/test.spec#User Management#Create User`]: '@T87654321',
        },
      };

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = cleanIdsGauge(testomatioMap, tempDir, { pattern: '**/*.spec' });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('User Management');
      expect(updatedContent).not.to.include('@S12345678');
      expect(updatedContent).to.include('Create User');
      expect(updatedContent).not.to.include('@T87654321');
    });

    it('preserves original formatting when cleaning', () => {
      const specContent = `# User Management   @S12345678  

## Create User   @T87654321  
* Open user form`;

      const testomatioMap = {
        suites: {
          [`${tempDir}/test.spec#User Management`]: '@S12345678',
        },
        tests: {
          [`${tempDir}/test.spec#User Management#Create User`]: '@T87654321',
        },
      };

      const specPath = path.join(tempDir, 'test.spec');
      fs.writeFileSync(specPath, specContent);

      const updatedFiles = cleanIdsGauge(testomatioMap, tempDir, { pattern: '**/*.spec' });

      expect(updatedFiles).to.include(specPath);
      const updatedContent = fs.readFileSync(specPath, 'utf8');
      expect(updatedContent).to.include('# User Management');
      expect(updatedContent).not.to.include('@S12345678');
      expect(updatedContent).to.include('## Create User');
      expect(updatedContent).not.to.include('@T87654321');
    });
  });
});
