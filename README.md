# Daily VCS (Video Component System)

A React-based graphics framework for composing video layouts, created by [Daily](https://daily.co). VCS is used to build compositions that control how participants, text, images, and overlays are arranged in live streaming and recording outputs.

Compositions are React components that use VCS's built-in primitives (`Box`, `Video`, `Text`, `Image`) and hooks (`useParams`, `useActiveVideo`, `useVideoTime`) to define dynamic video layouts.

## Quick start

```bash
cd js
npm install
npm run devrig -- daily:baseline
```

This starts the VCS development rig at `http://localhost:8083` with the `daily-baseline` composition loaded. The devrig provides simulated video inputs, parameter controls, and a live preview of the composition output.

## Repository structure

```
js/                     Core library and development toolchain (@daily-co/vcs-core)
compositions/           Composition packages (each is a directory with an index.jsx entry point)
  daily-baseline/       Full-featured composition with grid, PiP, split, and overlay layouts
  daily-meeting/        Meeting-focused composition reusing daily-baseline components
  daily-rundown/        Rundown/show layout composition
  daily-roomdebug/      Debug composition for room state inspection
compositions-npm-pkg/   Wrappers for publishing compositions as npm packages
cut-transcript-tools/   Tools for working with transcripts and VCS cut files
server-render/          Server-side rendering tools (webframe, asset-download, vcscut)
res/                    Shared resources (fonts, test assets)
```

## Writing a composition

A composition is a React component that exports a `compositionInterface` object and a default function component:

```javascript
import * as React from 'react';
import { Box, Video, Text } from '#vcs-react/components';
import { useParams, useActiveVideo } from '#vcs-react/hooks';

export const compositionInterface = {
  displayMeta: {
    name: 'My Composition',
    description: 'A simple example',
  },
  params: [
    { id: 'showLabels', type: 'boolean', defaultValue: false },
  ],
};

export default function MyComposition() {
  const params = useParams();
  const { activeIds, displayNamesById } = useActiveVideo();

  return (
    <Box id="main">
      {activeIds.map((videoId, i) => (
        <Box key={i}>
          <Video src={videoId} />
          {params.showLabels && <Text>{displayNamesById[videoId]}</Text>}
        </Box>
      ))}
    </Box>
  );
}
```

Save this as `compositions/daily-mycomp/index.jsx`, then run:

```bash
npm run devrig -- daily:mycomp
```

### Composition ID format

Compositions are identified by `{namespace}:{name}`:

| Namespace | Path | Example |
|-----------|------|---------|
| `daily` | `compositions/daily-{name}/index.jsx` | `daily:baseline` |
| `dev` | `compositions/dev-{name}/index.jsx` | `dev:test` |
| `experiment` | `compositions/experiment-{name}/index.jsx` | `experiment:newlayout` |
| `example` | `js/example/{name}.jsx` | `example:hello` |

### Available components

Import from `#vcs-react/components`:

- **`Box`** -- layout container, the basic building block
- **`Video`** -- renders a participant's video stream
- **`Text`** -- renders styled text
- **`Image`** -- renders an image asset
- **`Emoji`** -- renders emoji
- **`WebFrame`** -- embeds a web page

### Available hooks

Import from `#vcs-react/hooks`:

- **`useParams()`** -- access composition parameters (defined in `compositionInterface.params`)
- **`useActiveVideo()`** -- get active video participant IDs and display names
- **`useStandardSources()`** -- access chat messages, transcripts, emoji reactions
- **`useVideoTime()`** -- current time in the stream
- **`useViewportSize()`** -- output dimensions
- **`useGrid()`** -- grid unit info for responsive layouts

### Layout system

Layouts are functions applied via the `layout` prop. Built-in layouts from `#vcs-stdlib/layouts`:

- **Transform**: `pad`, `offset`, `fit`
- **Split**: `splitHorizontal`, `splitVertical`, `splitAcrossLongerDimension`
- **Grid**: `column`, `grid`, `simpleLineGrid`

```javascript
import { pad, splitVertical } from '#vcs-stdlib/layouts';

<Box layout={[pad, { pad_gu: 1 }]}>
  <Box layout={[splitVertical, { index: 0, count: 2 }]}>
    <Video src={videoId} />
  </Box>
</Box>
```

### compositionInterface fields

| Field | Description |
|-------|-------------|
| `displayMeta` | `{ name, description }` shown in the devrig UI |
| `params` | Array of parameter definitions (`{ id, type, defaultValue }`) |
| `fontFamilies` | Font names to load (from `res/fonts/`) |
| `imagePreloads` | Image asset names to preload |
| `standardSources` | Data sources to enable (`'chatMessages'`, `'transcript'`, `'emojiReactions'`) |

## Further reading

- [Daily VCS Reference Docs](https://docs.daily.co/reference/vcs)
- [js/README.md](js/README.md) -- SDK toolchain details, build targets, architecture
- Questions or issues: [help@daily.co](mailto:help@daily.co)
