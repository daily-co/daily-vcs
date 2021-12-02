
/*
  Translates a composition id to a path to its root component.
  
  The id format is {namespace}:{name}, e.g. "example:hello".
*/
function getCompPathFromId(compId) {
  if (!compId) {
    console.error("** VCS composition id must be a string, got: " + compId);
    return null;
  }
  let idx = compId.indexOf(':');
  if (idx < 0) {
    console.error("** VCS composition id must have colon as namespace separator (e.g. example:hello)");
    return null;
  }

  const compNamespace = compId.substr(0, idx);
  const compFilename = compId.substr(idx + 1);
  let jsxPath;
  let baseDir;

  if (compNamespace == 'example') {
    baseDir = '../example';
    jsxPath = `${baseDir}/${compFilename}.jsx`;
  }
  else if (compNamespace == 'daily') {
    baseDir = `../../compositions/daily-${compFilename}`;
    jsxPath = `${baseDir}/index.jsx`;
  }
  else {
    console.error("** Unsupported VCS composition namespace: ", compId);
    return null;
  }
  return jsxPath;
}

module.exports = {
  getCompPathFromId,
};
