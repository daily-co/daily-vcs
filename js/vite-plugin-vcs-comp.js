/*
  Vite plugin that resolves the '__VCS_COMP_PATH__' placeholder import
  in lib-browser/vcs-browser.js to the actual composition file path.

  This is the Vite equivalent of the NormalModuleReplacementPlugin
  that was used in the webpack config.
*/
export default function vcsCompPlugin(compImportPath) {
  return {
    name: 'vcs-comp-path',
    resolveId(source) {
      if (source === '__VCS_COMP_PATH__') {
        return compImportPath;
      }
    },
  };
}
