const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const { getCompPathFromId } = require('./comp-namespace-util.js');

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
  const compId = env.compid;
  if (!compId || compId.length < 1) {
    console.error(
      '** Must provide VCS composition id (use webpack CLI arg --env compid={id})'
    );
    process.exit(2);
  }
  if (!(compositionImportPath = getCompPathFromId(compId, 'browser'))) {
    process.exit(3);
  }

  let isDev = true;

  const compFilenameBase = compId.replace(/:/g, '_');

  const useCompFilename = env.use_comp_filename;
  if (useCompFilename) {
    console.log("Exporting with comp filename, will use production mode");
    isDev = false;
  }

  return {
    mode: isDev ? 'development' : 'production',
    entry: {
      devrig: './lib-browser/vcs-browser.js' //path.resolve(__dirname, '', 'vcs-browser.js'),
    },
    target: 'web',
    output: {
      library: {
        name: 'DailyVCS',
        type: 'window',
      },
      filename: useCompFilename ? `${compFilenameBase}.bundle.js` : '[name].bundle.js', 
      path: path.resolve('build'),
      clean: true,
    },
    devServer: {
      port: 8083,
      static: {
        directory: './build'
      }
    },
    devtool: isDev ? 'cheap-source-map' : false,
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
                  "@babel/plugin-transform-runtime",
                ],
              },
            },
          ],
        },
      ],
    },
    plugins: [
      breakOnWarningPlugin,
      moduleReplacementPlugin,

      // following buffer plugin is needed by textkit (from react-pdf)
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
        process: "process/browser",
      }),

      // dev server
      new HtmlWebpackPlugin({
        title: 'Daily VCS devrig',
        template: 'devrig/vcs-rig.html',
        filename: useCompFilename ? `${compFilenameBase}.html` : 'index.html',
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: "./devrig/example-assets", to: "example-assets" },
          { from: "./devrig/ui-assets", to: "ui-assets" },
          { from: "../res", to: "res" },
        ],
      }),  
    ],
    externals: [],
    optimization: {
      minimize: false,
    },
    resolve: {
      alias: {
        '#vcs': path.resolve('./src'),
        '#vcs-react': path.resolve('./src/react'),
      },
      fallback: {
        // following fallbacks are needed by textkit (from react-pdf)
        process: require.resolve("process/browser"),
        zlib: require.resolve("browserify-zlib"),
        stream: require.resolve("stream-browserify"),
        util: require.resolve("util"),
        buffer: require.resolve("buffer"),
        asset: require.resolve("assert"),
      },  
    },
  };
};

module.exports = [wwwClientConfig];
