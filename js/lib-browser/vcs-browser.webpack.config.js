const path = require('path');
const webpack = require('webpack');
const { getCompPathFromId } = require('../comp-namespace-util.js');

const breakOnWarningPlugin = function () {
  this.hooks.done.tap('BreakOnWarning', (stats) => {
    if (stats.compilation.warnings) {
      for (const warn of stats.compilation.warnings) {
        // Babel parse errors within modules end up in Webpack warnings,
        // so ensure we break the build process on these
        if (warn.name === 'ModuleBuildError') {
          console.error(
            "** Webpack build encountered '%s' warning, will treat as critical:\n",
            warn.name,
            warn.error
          );
          process.exit(2);
        }
      }
    }
  });
};

// the user is expected to provide a composition id on the command line.
// using moduleReplacementPlugin, the root import in vcs-browser.js is replaced
// so that only the specified composition is loaded.
let compositionImportPath;

const moduleReplacementPlugin = new webpack.NormalModuleReplacementPlugin(
  /(.*)__VCS_COMP_PATH__(\.*)/,
  function (resource) {
    resource.request = resource.request.replace(
      /__VCS_COMP_PATH__/,
      compositionImportPath
    );
  }
);

const wwwClientConfig = function (env) {
  const isDev = true;
  const compId = env.vcsCompId;

  if (!compId || compId.length < 1) {
    console.error(
      '** Must provide VCS composition id (use webpack CLI arg env=vcsCompId={id})'
    );
    return false;
  }
  if (!(compositionImportPath = getCompPathFromId(compId, 'browser'))) {
    process.exit(3);
  }

  return {
    mode: isDev ? 'development' : 'production',
    entry: [path.resolve(__dirname, 'vcs-browser.js')],
    target: 'web',
    output: {
      library: {
        name: 'DailyVCS',
        type: 'window',
      },
      path: path.resolve(__dirname, '..', 'build'),
      filename: 'daily-vcs-browser.js',
    },
    devtool: 'cheap-source-map',
    module: {
      rules: [
        {
          test: /\.(js|jsx)?$/,
          exclude: [/node_modules/],
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  [
                    '@babel/preset-env',
                    {
                      ignoreBrowserslistConfig: true,
                    },
                  ],
                  '@babel/preset-react',
                ],
                plugins: ['@babel/plugin-proposal-class-properties'],
              },
            },
          ],
        },
      ],
    },
    plugins: [breakOnWarningPlugin, moduleReplacementPlugin],
    externals: [],
    optimization: {
      minimize: false,
    },
    resolve: {
      alias: {
        '#vcs': path.resolve(__dirname, '../src'),
        '#vcs-react': path.resolve(__dirname, '../src/react'),
      },
    },
  };
};

module.exports = [wwwClientConfig];
