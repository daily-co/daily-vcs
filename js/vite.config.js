import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

import { getCompPathFromId } from './comp-namespace-util.js';
import vcsCompPlugin from './vite-plugin-vcs-comp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export default defineConfig(({ command, mode }) => {
  // Compositions use .js extension for files containing JSX (React 17 style).
  // Use esbuild's JSX transform directly instead of @vitejs/plugin-react,
  // since we don't need Fast Refresh or React 19 features.
  const esbuildConfig = {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    loader: 'jsx',
    include: /\.(js|jsx)$/,
  };
  const compId = process.env.VCS_COMPID;
  const target = process.env.VCS_TARGET || 'devrig';
  const vcsroot = process.env.VCS_VCSROOT || undefined;
  const useCompFilename = !!process.env.VCS_USE_COMP_FILENAME;

  if (!compId || compId.length < 1) {
    console.error(
      '** Must provide VCS composition id via VCS_COMPID env var'
    );
    process.exit(2);
  }

  const compImportPath = getCompPathFromId(compId, 'browser', vcsroot);
  if (!compImportPath) {
    process.exit(3);
  }

  const compFilenameBase = compId.replace(/:/g, '_');

  // check if this composition is a directory with an images/ subdir
  const isCompBundleDir =
    path.basename(compImportPath).toLowerCase().indexOf('index.js') === 0;

  // shared resolve aliases
  const resolveConfig = {
    alias: {
      // VCS SDK internal aliases (used by compositions)
      '#vcs': path.resolve(__dirname, 'src'),
      '#vcs-react': path.resolve(__dirname, 'src/react'),
      '#vcs-stdlib': path.resolve(__dirname, 'src/stdlib'),

      // libraries offered to VCS compositions.
      // compositions live in a sibling dir so they can't resolve
      // bare specifiers from our node_modules directly.
      react: path.dirname(require.resolve('react/package.json')),
      uuid: path.dirname(require.resolve('uuid/package.json')),
      'random-seed': path.dirname(
        require.resolve('random-seed/package.json')
      ),

      // polyfills needed by textkit (from react-pdf)
      'process/browser': require.resolve('process/browser'),
      zlib: require.resolve('browserify-zlib'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util'),
      buffer: require.resolve('buffer'),
      assert: require.resolve('assert'),
    },
  };

  // Plugin to transform .js files containing JSX before Rollup's parser.
  // Compositions use .js extension for JSX files; Rollup's import analysis
  // would choke on the JSX syntax if we don't transform first.
  const jsxInJsPlugin = {
    name: 'vcs-jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (/\.js$/.test(id) && !id.includes('node_modules')) {
        // quick check: does this file actually contain JSX?
        if (code.includes('<') && (/^\s*return\s+<|[=(]\s*</m).test(code)) {
          const { transformSync } = await import('esbuild');
          const result = transformSync(code, {
            loader: 'jsx',
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
          });
          return { code: result.code, map: result.map || null };
        }
      }
    },
  };

  // shared plugins
  const sharedPlugins = [
    jsxInJsPlugin,
    vcsCompPlugin(compImportPath),
  ];

  // shared define values
  const sharedDefine = {
    VCS_BUILD_IS_PROD: JSON.stringify(mode === 'production'),
  };

  if (target === 'module_web') {
    return {
      esbuild: esbuildConfig,
      resolve: resolveConfig,
      plugins: [
        ...sharedPlugins,
        // Ensure dist/ has a package.json declaring CommonJS type,
        // since the parent js/package.json has "type": "module" which
        // would cause Node to treat .js files as ESM.
        {
          name: 'vcs-cjs-package-json',
          writeBundle() {
            const distPkg = path.resolve(__dirname, 'dist', 'package.json');
            if (!fs.existsSync(distPkg)) {
              fs.writeFileSync(
                distPkg,
                JSON.stringify({ type: 'commonjs' }, null, 2) + '\n'
              );
            }
          },
        },
      ],
      define: sharedDefine,
      build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: false,
        lib: {
          entry: path.resolve(__dirname, 'lib-browser/vcs-browser.js'),
          formats: ['cjs'],
          fileName: () => `${compFilenameBase}.bundle.js`,
        },
        minify: true,
        sourcemap: false,
      },
    };
  }

  if (target === 'devrig') {
    const isDev = !useCompFilename;

    // static asset directories to copy
    // Use structured:false so only the file name is preserved (no nesting)
    const copyTargets = [
      { src: 'devrig/example-assets/*', dest: 'example-assets', rename: { stripBase: true } },
      { src: 'devrig/ui-assets/*', dest: 'ui-assets', rename: { stripBase: true } },
      { src: '../res/fonts/*', dest: 'res/fonts', rename: { stripBase: true } },
      { src: '../res/test-assets/*', dest: 'res/test-assets', rename: { stripBase: true } },
    ];

    if (isCompBundleDir) {
      const baseDir = path.dirname(compImportPath);
      const imagesDir = path.resolve(baseDir, 'images');
      if (fs.existsSync(imagesDir)) {
        console.log('Will copy composition asset images: ', imagesDir);
        copyTargets.push({
          src: path.resolve(imagesDir) + '/*',
          dest: 'composition-assets/images',
          rename: { stripBase: true },
        });
      }
    }

    return {
      root: __dirname,
      // Use relative paths in build output so it works from file:// and S3
      base: useCompFilename ? './' : undefined,
      esbuild: esbuildConfig,
      optimizeDeps: {
        // Include Node polyfills in dep pre-bundling so they aren't
        // externalized. These are needed by react-pdf/fontkit/textkit.
        include: [
          'buffer',
          'process/browser',
          'util',
          'assert',
          '@react-pdf/fontkit',
        ],
        // Don't exclude these — Vite would otherwise externalize
        // them as Node builtins.
        exclude: [],
        esbuildOptions: {
          loader: { '.js': 'jsx' },
          define: {
            global: 'globalThis',
          },
          // Map Node builtins to their browser polyfill packages
          // so esbuild bundles them instead of externalizing.
          alias: {
            util: require.resolve('util'),
            buffer: require.resolve('buffer'),
            assert: require.resolve('assert'),
            stream: require.resolve('stream-browserify'),
            zlib: require.resolve('browserify-zlib'),
          },
          // Prepend Buffer/process polyfills into pre-bundled node_modules
          // that reference these Node globals at the top level.
          plugins: [
            {
              name: 'polyfill-node-globals',
              setup(build) {
                const polyfillBanner = [
                  'import { Buffer as __Buffer } from "buffer";',
                  'import __process from "process/browser";',
                  'if (typeof globalThis.Buffer === "undefined") globalThis.Buffer = __Buffer;',
                  'if (typeof globalThis.process === "undefined") globalThis.process = __process;',
                ].join('\n');

                build.onLoad({ filter: /node_modules/ }, async (args) => {
                  let contents;
                  try {
                    contents = await fs.promises.readFile(
                      args.path,
                      'utf8'
                    );
                  } catch {
                    return; // file doesn't exist (e.g. conditional require)
                  }
                  // Only inject into files that actually use Buffer or process
                  if (
                    contents.includes('Buffer') ||
                    contents.includes('process')
                  ) {
                    return {
                      contents: polyfillBanner + '\n' + contents,
                      loader: args.path.endsWith('.mjs') ? 'js' : undefined,
                    };
                  }
                });
              },
            },
          ],
        },
      },
      resolve: resolveConfig,
      plugins: [
        ...sharedPlugins,
        // Map the devrig's URL structure in the dev server.
        // The old webpack setup served everything flat from /.
        // We replicate that by rewriting URLs to actual file locations.
        {
          name: 'vcs-devrig-server',
          configureServer(server) {
            const { createReadStream } = fs;
            const serveStatic = (res, filePath, contentType) => {
              if (!fs.existsSync(filePath)) {
                res.writeHead(404);
                res.end();
                return;
              }
              res.writeHead(200, { 'Content-Type': contentType || 'application/octet-stream' });
              createReadStream(filePath).pipe(res);
            };

            server.middlewares.use((req, res, next) => {
              // Redirect / to the devrig HTML
              if (req.url === '/' || req.url === '/index.html') {
                res.writeHead(302, { Location: '/devrig/vcs-rig.html' });
                res.end();
                return;
              }

              // res/ is at ../res/ relative to js/.
              // URLs arrive as /devrig/res/... (relative from /devrig/vcs-rig.html)
              const resMatch = req.url.match(/^(?:\/devrig)?\/res\/(.*)/);
              if (resMatch) {
                const filePath = path.resolve(__dirname, '..', 'res', resMatch[1]);
                const ext = path.extname(filePath).toLowerCase();
                const types = { '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
                return serveStatic(res, filePath, types[ext]);
              }

              // composition-assets/ served from composition images dir
              const compAssetsMatch = req.url.match(/^(?:\/devrig)?\/composition-assets\/images\/(.*)/);
              if (compAssetsMatch && isCompBundleDir) {
                const filePath = path.resolve(path.dirname(compImportPath), 'images', compAssetsMatch[1]);
                const ext = path.extname(filePath).toLowerCase();
                const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
                return serveStatic(res, filePath, types[ext]);
              }

              next();
            });
          },
        },
        // Only copy assets for dev server; for build-browser the
        // deployer provides res/, example-assets/ etc. themselves.
        ...(!useCompFilename ? [viteStaticCopy({ targets: copyTargets })] : []),
        // For build-browser: fix the output for static file hosting
        ...(useCompFilename
          ? [
              {
                name: 'vcs-fix-static-html',
                transformIndexHtml: {
                  order: 'post',
                  handler(html) {
                    // Remove type="module" and crossorigin from script tags
                    // so the IIFE bundle loads from file:// protocol
                    return html.replace(
                      /<script type="module" crossorigin/g,
                      '<script'
                    );
                  },
                },
                // Move HTML from build/devrig/ to build root and fix paths
                closeBundle() {
                  const buildDir = path.resolve(__dirname, 'build');
                  const srcHtml = path.join(buildDir, 'devrig', 'vcs-rig.html');
                  const destHtml = path.join(
                    buildDir,
                    `${compFilenameBase}.html`
                  );
                  if (fs.existsSync(srcHtml)) {
                    let html = fs.readFileSync(srcHtml, 'utf8');
                    // Fix asset paths: ../assets/ → assets/, ../bundle.js → bundle.js
                    html = html.replace(/\.\.\//g, '');
                    fs.writeFileSync(destHtml, html);
                    fs.unlinkSync(srcHtml);
                    // Remove empty devrig dir
                    try { fs.rmdirSync(path.join(buildDir, 'devrig')); } catch {}
                  }
                },
              },
            ]
          : []),
      ],
      define: sharedDefine,
      server: {
        port: 8083,
        fs: {
          // Allow serving files from the parent vcs/ directory
          // (needed for ../res/fonts/, ../res/test-assets/,
          // and ../compositions/*/images/)
          allow: [__dirname, path.resolve(__dirname, '..')],
        },
      },
      build: {
        outDir: path.resolve(__dirname, 'build'),
        emptyOutDir: true,
        rollupOptions: {
          input: path.resolve(__dirname, 'devrig/vcs-rig.html'),
          output: {
            // Use IIFE format so the built page works from file:// (e.g. S3)
            // without a module-capable server.
            format: 'iife',
            entryFileNames: useCompFilename
              ? `${compFilenameBase}.bundle.js`
              : 'devrig.bundle.js',
            // Don't hash asset filenames — the HTML references them
            // by original name (example-assets/demoperson_missfury.png etc.)
            assetFileNames: 'assets/[name][extname]',
            inlineDynamicImports: true,
          },
        },
        // Don't process/rewrite asset URLs in HTML — keep original
        // relative paths so they work with the flat copied structure.
        assetsInlineLimit: 0,
        minify: !isDev,
        sourcemap: isDev ? true : false,
      },
    };
  }

  console.error(
    "** Must specify VCS_TARGET env var (either 'devrig' or 'module_web')"
  );
  process.exit(4);
});
