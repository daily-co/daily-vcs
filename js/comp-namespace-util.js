import * as Path from 'path';
import { fileURLToPath } from 'url';

/*
  Translates a composition id to a path to its root component.
  
  The id format is {namespace}:{name}, e.g. "example:hello".
*/
export function getCompPathFromId(compId, targetId, vcsBaseDir) {
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

  if (!vcsBaseDir || vcsBaseDir.length < 1) {
    switch (targetId) {
      case 'browser':
        vcsBaseDir = '..';
        break;

      case 'node': {
        const __dirname = Path.dirname(fileURLToPath(import.meta.url));
        vcsBaseDir = Path.resolve(__dirname, '..');
        break;
      }

      default:
        console.error(
          "** Unknown target specified for getCompPathForId: '%s'",
          targetId
        );
        return null;
    }
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

    // recognized namespaces in our 'compositions' directory
    case 'dev':
    case 'experiment':
    case 'daily': {
      compDir = Path.resolve(
        vcsBaseDir,
        `compositions/${compNamespace}-${compFilename}`
      );
      jsxPath = `${compDir}/index.jsx`;
      break;
    }

    default:
      console.error('** Unsupported VCS composition namespace: ', compId);
      return null;
  }
  return jsxPath;
}
