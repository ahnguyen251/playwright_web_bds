const { readdirSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const projectPath = process.env.TS_NODE_PROJECT;
if (!projectPath) throw new Error('Expected TS_NODE_PROJECT');
require('ts-node').register({
  project: projectPath,
  transpileOnly: true,
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'Node',
    rootDir: path.dirname(projectPath),
    ignoreDeprecations: '6.0',
  },
});

const targetPath = process.argv[2];
if (!targetPath) throw new Error('Expected an absolute module path');

const originalLoad = Module._load;
let databaseOpenCount = 0;

class ImportBoundaryDatabase {
  constructor() {
    databaseOpenCount += 1;
  }

  pragma() {}

  close() {}
}

Module._load = function loadWithDatabaseProbe(request, parent, isMain) {
  if (request === 'better-sqlite3') return ImportBoundaryDatabase;
  return Reflect.apply(originalLoad, this, [request, parent, isMain]);
};

const beforeEntries = new Set(readdirSync(process.cwd()));
Reflect.deleteProperty(process.env, 'IMPORT_BOUNDARY_SENTINEL');

require(path.resolve(targetPath));

const addedPaths = readdirSync(process.cwd())
  .filter((entry) => !beforeEntries.has(entry))
  .sort();
const result = {
  databaseOpenCount,
  sentinelLoaded: process.env.IMPORT_BOUNDARY_SENTINEL === 'loaded',
  addedPaths,
};

process.stdout.write(`${JSON.stringify(result)}\n`);
