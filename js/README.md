# VCS Core Library and Toolchain

This directory contains `@daily-co/vcs-core`: the JavaScript core library for VCS and its development tools.

## Prerequisites

- **Node 18+** required (the line-protocol runner and other Node-side tools run on production servers with Node 18)
- **Node 20+** recommended for local development (Vite dev server)

## Setup

```bash
npm install
```

## Development

### Devrig (composition simulator)

```bash
npm run devrig -- daily:baseline
```

Opens at `http://localhost:8083`. The devrig provides:

- Live composition preview with simulated video inputs
- Interactive parameter controls (generated from `compositionInterface.params`)
- Output format selector (16:9, square, 9:16)
- Scene description inspector
- API call testing

### npm scripts

| Script | Description |
|--------|-------------|
| `npm run devrig -- {compid}` | Start devrig dev server for a composition |
| `npm run open-browser -- {compid}` | Same as devrig, opens browser automatically |
| `npm run build-browser -- {compid}` | Build static devrig for hosting (S3, etc.) |
| `npm run build-composition-module-for-web {compid} {vcsroot}` | Build CJS bundle for npm package |
| `npm run line-protocol -- --compid {compid}` | Run the line-protocol streaming renderer |
| `npm run test-scenario -- --scenario {path}` | Run a test scenario |
| `npm run benchmark-graphics-test` | Run graphics benchmark |

Composition IDs use the format `{namespace}:{name}`, e.g. `daily:baseline`, `example:hello`.

## Build targets

### devrig (dev server)

`npm run devrig` starts a Vite dev server. Used for local composition development and testing.

### build-browser (static build)

`npm run build-browser` produces a self-contained HTML page with the composition bundle. Output goes to `build/`:

```
build/
  daily_baseline.html         HTML page (open this)
  daily_baseline.bundle.js    Composition bundle (IIFE format)
  assets/                     Demo images from the devrig
```

The deployer is responsible for providing `res/fonts/` and `composition-assets/images/` alongside the HTML.

### module_web (npm package bundle)

`npm run build-composition-module-for-web` produces a CommonJS bundle at `dist/{compid}.bundle.js`. This is used by the `compositions-npm-pkg/` wrappers to publish compositions as npm packages (e.g. `@daily-co/vcs-composition-daily-baseline-web`).

Web client applications import this bundle to render VCS compositions in their own UI.

## Architecture

### Composition loading

When you run `npm run devrig -- daily:baseline`:

1. The composition ID `daily:baseline` is parsed by `comp-namespace-util.js` into a file path: `../compositions/daily-baseline/index.jsx`
2. A Vite plugin (`vite-plugin-vcs-comp.js`) intercepts the `__VCS_COMP_PATH__` import in `lib-browser/vcs-browser.js` and resolves it to the actual composition path
3. Vite bundles the composition together with the VCS core library
4. `devrig/devrig-entry.js` loads the bundle and exposes it to the devrig HTML UI

### Import aliases

Compositions use these import aliases to access the VCS SDK:

| Alias | Resolves to |
|-------|-------------|
| `#vcs-react/components` | `src/react/components/index.js` |
| `#vcs-react/contexts` | `src/react/contexts/index.js` |
| `#vcs-react/hooks` | `src/react/hooks/index.js` |
| `#vcs-stdlib/components` | `src/stdlib/components/index.js` |
| `#vcs-stdlib/layouts` | `src/stdlib/layouts/index.js` |

These are defined both in `package.json` `imports` (for Node) and `vite.config.js` `resolve.alias` (for the browser build).

Compositions also import `react`, `uuid`, and `random-seed` as bare specifiers. Since compositions live outside `js/node_modules`, these are resolved via Vite aliases pointing back to `js/node_modules/`.

### Node-side tools

The line-protocol runner (`vcs-line-protocol-main.js`), test runner, and benchmark tool are standalone Node.js programs. They use SWC (not Vite) for JSX transpilation and are unaffected by the Vite build configuration. They run on Node 18+ and are used in production on Daily's media servers.

### Browser polyfills

The VCS core library depends on `@react-pdf/fontkit` and `@react-pdf/textkit` for text rendering, which require `Buffer` and `process` globals. In the browser:

- **Dev server**: polyfills are injected via an esbuild plugin during Vite's dependency pre-bundling, and `devrig/browser-polyfills.js` sets the globals before the library loads
- **Production builds**: polyfills are bundled directly via `resolve.alias` mappings to the `buffer` and `process` npm packages
