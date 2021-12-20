const Path = require('path');

/*
  Translates a composition id to a path to its root component.
  
  The id format is {namespace}:{name}, e.g. "example:hello".
*/
function getCompPathFromId(compId, targetId) {
  if (!compId) {
    console.error('** VCS composition id must be a string, got: ' + compId);
    return null;
  }
  let idx = compId.indexOf(':');
  if (idx < 0) {
    console.error(
      '** VCS composition id must have colon as namespace separator (e.g. example:hello)'
    );
    return null;
  }

  let vcsBaseDir;
  switch (targetId) {
    case 'browser':
      vcsBaseDir = '..';
      break;

    case 'node':
      vcsBaseDir = Path.resolve(__dirname, '..');
      break;

    default:
      console.error(
        "** Unknown target specified for getCompPathForId: '%s'",
        targetId
      );
      return null;
  }

  const compNamespace = compId.substr(0, idx);
  const compFilename = compId.substr(idx + 1);
  let jsxPath;
  let compDir;

  switch (compNamespace) {
    case 'example':
      compDir = Path.resolve(vcsBaseDir, 'js/example');
      jsxPath = `${compDir}/${compFilename}.jsx`;
      break;

    case 'daily': {
      compDir = Path.resolve(vcsBaseDir, `compositions/daily-${compFilename}`);

      if (targetId === 'node') {
        // we want to load code from outside the current package root,
        // but that's not possible in Node with dynamic require while using
        // the subpath imports like "#vcs-react".
        // so, let's just copy the files under our build dir.
        // it works...
        const fs = require('fs-extra');
        const tmpDir = Path.resolve(vcsBaseDir, 'js/build/temp-comp');
        fs.ensureDirSync(tmpDir);
        fs.copySync(compDir, tmpDir);
        compDir = tmpDir;
      }

      jsxPath = `${compDir}/index.jsx`;
      break;
    }

    default:
      console.error('** Unsupported VCS composition namespace: ', compId);
      return null;
  }
  return jsxPath;
}

module.exports = {
  getCompPathFromId,
};
