const path = require('path');

const breakOnWarningPlugin = function() {
  this.hooks.done.tap('BreakOnWarning', stats => {
    if (stats.compilation.warnings) {
      for (const warn of stats.compilation.warnings) {
        // Babel parse errors within modules end up in Webpack warnings,
        // so ensure we break the build process on these
        if (warn.name === 'ModuleBuildError') {
          console.error(
            "** Webpack build encountered '%s' warning, will treat as critical:\n",
            warn.name,
            warn.error,
          );
          process.exit(2);
        }
      }
    }
  });
};

const wwwClientConfig = function(env) {
  const isDev = true;

  return {
    mode: isDev ? 'development' : 'production',
    entry: [
      path.resolve(__dirname, 'vcs-browser.js'),
    ],
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
                plugins: [
                  '@babel/plugin-proposal-class-properties',
                ],
              },
            },
          ],
        },

      ],
    },
    plugins: [
      breakOnWarningPlugin,
    ],
    externals: [
    ],
    optimization: {
      minimize: false,
    },
  };
};

module.exports = [wwwClientConfig];
