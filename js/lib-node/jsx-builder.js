import { ensureDirSync } from 'fs-extra';
import * as fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
import * as Path from 'path';
import { fileURLToPath } from 'url';
import { logToHostInfo } from './log.js';

import * as swc from '@swc/core';

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

const swcConfigBase = {
  transform: null,
  target: 'es2016',
  loose: false,
  externalHelpers: false,
  keepClassNames: true,
};

const swcConfig_jsc = {
  ...swcConfigBase,
  parser: {
    syntax: 'ecmascript',
    jsx: true,
    dynamicImport: false,
    privateMethod: false,
    functionBind: false,
    exportDefaultFrom: false,
    exportNamespaceFrom: false,
    decorators: false,
    decoratorsBeforeExport: false,
    topLevelAwait: false,
    importMeta: false,
  },
};
const swcConfig_jsc_typescript = {
  ...swcConfigBase,
  parser: {
    syntax: 'typescript',
    tsx: true,
    decorators: false,
    dynamicImport: false,
  },
};

export async function prepareCompositionAtPath(srcCompPath, compId, sessionId) {
  const buildId =
    compId.replace(/:/g, '_') + (sessionId ? '_' + sessionId : '');

  const buildDir = Path.resolve(
    __dirname,
    '..',
    'build',
    `temp_vcscomp_${buildId}`
  );

  ensureDirSync(buildDir);

  const dstIndexJsPath = Path.resolve(buildDir, 'index.js');

  // if the path points to an index file, it means we need to process the whole directory
  const compIsDir =
    Path.basename(srcCompPath).toLowerCase().indexOf('index.js') === 0;

  if (compIsDir) {
    await processCompDir(Path.dirname(srcCompPath), buildDir);
  } else {
    await transformJSXSource(srcCompPath, dstIndexJsPath);
  }

  return dstIndexJsPath;
}

async function transformJSXSource(srcPath, dstPath, isTS) {
  const filename = Path.basename(srcPath);

  const src = await readFile(srcPath, { encoding: 'utf8' });

  const output = await swc.transform(src, {
    filename,
    sourceMaps: false,
    isModule: true,
    jsc: isTS ? swcConfig_jsc_typescript : swcConfig_jsc,
  });

  await writeFile(dstPath, output.code);
}

async function processCompDir(compDir, buildDir) {
  const jobs = [];

  recurseJobsForDir(compDir, buildDir);

  function recurseJobsForDir(dir, dstDir) {
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const path = Path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        const newSubdir = Path.resolve(dstDir, dirent.name);

        ensureDirSync(newSubdir);

        recurseJobsForDir(path, newSubdir);
      } else {
        const ext = Path.extname(dirent.name).toLowerCase();
        const basename = Path.basename(dirent.name, ext);
        const dst = Path.resolve(dstDir, `${basename}.js`);

        if (ext === '.ts' || ext === '.tsx') {
          jobs.push(transformJSXSource(path, dst, true));
        } else if (ext === '.js' || ext === '.jsx') {
          jobs.push(transformJSXSource(path, dst, false));
        }
      }
    }
  }

  await Promise.all(jobs);
}
