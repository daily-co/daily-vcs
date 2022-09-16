import { ensureDirSync } from 'fs-extra';
import * as fs from 'fs';
import { readFile, writeFile, copyFile } from 'fs/promises';
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

export async function prepareCompositionAtPath(
  srcCompPath,
  compId,
  sessionId,
  assetDir
) {
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
    await processCompDir(Path.dirname(srcCompPath), buildDir, assetDir);
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

async function processCompDir(compDir, buildDir, assetDir) {
  const jobs = [];
  const sourceFilesInProgress = new Set();

  function addJobForFileIfIsSource(src, ext, dst) {
    // prevent multiple jobs for the same destination.
    // a session asset will take precedence because they're processed first.
    if (sourceFilesInProgress.has(dst)) {
      logToHostInfo('Skipping existing job %s', dst);
      return;
    }

    if (ext === '.ts' || ext === '.tsx') {
      jobs.push(transformJSXSource(src, dst, true));
      sourceFilesInProgress.add(dst);
    } else if (ext === '.js' || ext === '.jsx') {
      jobs.push(transformJSXSource(src, dst, false));
      sourceFilesInProgress.add(dst);
    }
  }

  if (assetDir) {
    // assets flow two ways:
    // code gets copied OUT into our build directory (1),
    // but for images, composition assets are also copied IN into the session assets dir (2)
    // to make things easier for the server renderer (both comp+session assets are in one place).

    // 1.
    // check if session assets contain any JS/JSX files that we should copy in place & transpile.
    // currently these are supported in only the root dir and the 'components' subdir.
    // this limitation exists to discourage users from uploading complex folder hierarchies this way.
    copySessionAssetCodeFiles(assetDir, buildDir);

    if (fs.existsSync(Path.resolve(assetDir, 'components'))) {
      const dstDir = Path.resolve(buildDir, 'components');
      ensureDirSync(dstDir);
      copySessionAssetCodeFiles(Path.resolve(assetDir, 'components'), dstDir);
    }

    function copySessionAssetCodeFiles(srcDir, dstDir) {
      logToHostInfo('Processing code assets: ', srcDir);
      for (const dirent of fs.readdirSync(srcDir, {
        withFileTypes: true,
      })) {
        logToHostInfo(' .. file %s', dirent.name, dirent.isDirectory());
        if (dirent.isDirectory()) continue;

        const ext = Path.extname(dirent.name);
        const basename = Path.basename(dirent.name, ext);

        // all code files at this point should have the .js extension
        const dst = Path.resolve(dstDir, `${basename}.js`);

        logToHostInfo('  ... src file %s, writing to %s', dirent.name, dst);
        addJobForFileIfIsSource(Path.resolve(srcDir, dirent.name), ext, dst);
      }
    }

    // 2.
    // if composition has images, make them available in the same place as session assets.
    // this makes it easier for canvex to find them all in one place.
    const srcImagesDir = Path.resolve(compDir, 'images');
    if (fs.existsSync(srcImagesDir)) {
      const dstImagesDir = Path.resolve(assetDir, 'images');
      ensureDirSync(dstImagesDir);

      logToHostInfo(
        'Processing composition images at %s, destination %s',
        srcImagesDir,
        dstImagesDir
      );

      for (const dirent of fs.readdirSync(srcImagesDir, {
        withFileTypes: true,
      })) {
        if (dirent.isDirectory()) {
          logToHostInfo(
            '** Folders inside composition images dir are not supported: ',
            dirent.name
          );
          continue;
        }
        const src = Path.resolve(srcImagesDir, dirent.name);
        const dst = Path.resolve(dstImagesDir, dirent.name);

        // don't overwrite existing images by the same name because those are overrides from the user
        if (!fs.existsSync(dst)) {
          jobs.push(copyFile(src, dst));
        }
      }
    }
  }

  recurseJobsForDir(compDir, buildDir);

  function recurseJobsForDir(dir, dstDir) {
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const path = Path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        const newSubdir = Path.resolve(dstDir, dirent.name);

        ensureDirSync(newSubdir);

        recurseJobsForDir(path, newSubdir);
      } else {
        const ext = Path.extname(dirent.name);
        const basename = Path.basename(dirent.name, ext);
        const dst = Path.resolve(dstDir, `${basename}.js`);

        addJobForFileIfIsSource(path, ext, dst);
      }
    }
  }

  await Promise.all(jobs);
}
