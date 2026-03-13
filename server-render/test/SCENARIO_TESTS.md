# VCS scenario tests

## Overview

Scenario tests verify that VCS compositions render correctly by comparing output
against checked-in "golden" baseline images. Each scenario runs a VCS composition
for a set number of frames, captures specific frames, and compares the output
pixel-for-pixel against the golden images.

The tests run two comparisons per output frame:
- **videoLayers JSON** — the layout/compositing metadata (platform-independent)
- **canvex-rendered PNG** — the foreground graphics rendered by canvex (platform-specific)

Because rendering depends on platform-specific libraries (Skia, freetype, CoreText),
golden images are maintained per platform with naming like:
```
vcs-output_49_fgdisplaylist.canvex.linux_skia_x86_64.png
vcs-output_49_fgdisplaylist.canvex.macos_skia_arm64.png
```

## Running tests locally (macOS)

```bash
cd vcs/server-render/canvex
meson build && ninja -C build

cd ../test
./run_all_tests.sh          # run all scenarios
./run_scenario.sh hello     # run a single scenario
```

This generates `macos_skia_arm64.png` golden images. To update macOS baselines,
just copy the output images from `output/<scenario>/` into `scenarios/<scenario>/`.

## Running tests on CI (Linux)

The CI workflow (`.github/workflows/vcs-core-tests.yaml`) runs on **ubuntu-22.04**
to match the production Docker image (`Dockerfile.rtmp`, based on `ubuntu:jammy`).

CI runs two passes:
1. **AddressSanitizer build** (`build-asan`) — checks for memory errors, results
   are informational only (LeakSanitizer exit codes don't fail the test)
2. **Production build** (`build`) — actual test comparison against golden images

The CI uploads all test output as a GitHub Actions artifact (`vcs-core-tests-report`)
regardless of pass/fail, so you can always inspect the rendered images.

## Updating Linux golden images (from a Mac)

Since you can't run canvex on Linux locally, updating Linux golden images requires
a CI round-trip:

1. **Push your changes** and ensure the PR has the `vcs-core` label to trigger CI.

2. **Download the CI artifact** (`vcs-core-tests-report`) from the GitHub Actions run.
   The rendered output is in the `output/` directory within the artifact.

3. **Visually inspect** the output images to verify they look correct.
   Check `output/<scenario>/` for the `*.linux_skia_x86_64.png` files.

4. **Copy the Linux images** into the scenario directories:
   ```bash
   # Example: copy all Linux golden images for a scenario
   cp output/hello/*linux_skia_x86_64.png \
      scenarios/hello/
   ```
   Only copy the specific images that changed — don't blindly overwrite all of them.

5. **Commit and push** the updated golden images. Make sure to `git add` any
   new (untracked) files — `git add -u` only stages modified files, not new ones.

6. **Re-run CI** to verify the golden images now match.

### When do Linux golden images need updating?

- Adding a new scenario (all images are new)
- Changing a composition's rendering output (layout, colors, text, etc.)
- Changing canvex rendering code (font loading, draw operations, etc.)
- Updating the Skia static library or system dependencies

## Adding a new scenario

1. Create a directory under `scenarios/` with a `vcs-scenario.js` file:
   ```javascript
   const state = {
     activeVideoInputSlots: [true],
     params: { /* composition params */ },
   };

   export default {
     compositionId: 'example:my-comp',
     durationInFrames: 60,
     outputFrames: [0, 30],      // which frames to capture
     initialState: { ...state },
     frameWillRenderCb: (frameIdx) => {
       // return updated state to trigger changes, or null
       return null;
     },
   };
   ```

2. Run locally on Mac to generate macOS golden images and JSON baselines:
   ```bash
   ./run_scenario.sh my-scenario
   cp output/my-scenario/*.json scenarios/my-scenario/
   cp output/my-scenario/*.macos_skia_arm64.png scenarios/my-scenario/
   ```

3. Push and follow the Linux golden image update workflow above.

4. The scenario is automatically included in `run_all_tests.sh` (it globs
   `scenarios/*`).

## Known issues and gotchas

### CI runner must match production OS version

The CI workflow is pinned to `ubuntu-22.04` (Jammy) to match the production
`Dockerfile.rtmp` base image. This is important because canvex's pre-built Skia
library (`canvex-skia/lib-static/linux-x64/libskia.a`) links dynamically against
the system freetype at runtime.

**Do not change the CI runner to `ubuntu-latest` or a newer Ubuntu version**
without first verifying that emoji rendering still works. Ubuntu 24.04 (Noble)
ships freetype 2.13.2, which causes a segfault in `FT_Get_Paint_Layers` when
Skia renders COLRv1 emoji glyphs from `NotoColorEmoji-Regular.ttf`:

```
SEGV in FT_Get_Paint_Layers (libfreetype.so.6)
  called from: Skia's drawCOLRv1Glyph → colrv1_traverse_paint
  triggered by: fillText_emoji display list command
```

The root cause is that Skia's build config does not set
`skia_use_system_freetype2=false`, so it depends on the system freetype ABI.
Jammy's freetype 2.11.1 is compatible; Noble's 2.13.2 is not. If the production
Docker image is ever upgraded to a newer Ubuntu, this will need to be addressed
(see options below).

Similarly, if the Skia static library is rebuilt, verify on the CI runner's
OS version that emoji rendering still works.

### Emoji rendering

The bundled `NotoColorEmoji-Regular.ttf` uses COLRv1 format (vector color layers).
Scenarios that use emoji (`hello`, `graphics-test`) exercise this code path.
If emoji rendering breaks, these scenarios will either crash (SEGV) or produce
images without emoji (golden image mismatch).

Emoji enters canvex rendering through:
- Explicit `<Emoji>` components in compositions
- The `embedEmojis()` function in `vcs/js/src/text/emoji.js`, which detects emoji
  in any text string and converts them to `fillText_emoji` display list commands

This means user-provided text (participant names, chat messages) with emoji will
trigger emoji rendering in production.

#### Fixing the freetype/Skia emoji incompatibility permanently

- **Option A**: Rebuild Skia with `skia_use_system_freetype2=false` to bundle
  freetype into `libskia.a`, eliminating the version dependency
- **Option B**: Replace the emoji font with an older CBDT/CBLC (bitmap) version
  of NotoColorEmoji that doesn't use COLRv1
- **Option C**: Use a rendering approach that doesn't go through freetype's
  COLRv1 paint layer API

### vcsrender base test

The `run_vcsrender_base_test.sh` test compares full YUV frame output from
vcsrender. This test may fail independently of the scenario tests (different
rendering pipeline). CI is configured to continue with scenario tests even if
the base test fails.

### AddressSanitizer (ASAN) findings

The ASAN build typically reports a 3686400-byte leak (one framebuffer allocation
in `main`). This is a known benign leak in the `canvex_render_frame` test utility
and does not indicate a real memory issue.

### System dependencies for building canvex on CI

The CI installs `meson`, `libpng-dev`, and `libfreetype-dev` via apt. If the
canvex meson build fails with missing dependencies, check `meson.build` for
the required `dependency()` calls: `zlib`, `libpng`, `freetype2`.

## File reference

```
vcs/server-render/test/
  run_all_tests.sh              — iterates scenarios/*, runs each
  run_scenario.sh               — runs one scenario, compares output vs golden
  run_vcsrender_base_test.sh    — separate YUV output comparison test
  canvex-render-frame-util.js   — calls canvex_render_frame binary
  scenarios/
    <name>/
      vcs-scenario.js           — scenario definition
      vcs-output_*_videolayers.json           — golden videoLayers JSON
      vcs-output_*_fgdisplaylist.canvex.json  — golden canvex display list JSON
      vcs-output_*.linux_skia_x86_64.png      — golden rendered PNG (Linux)
      vcs-output_*.macos_skia_arm64.png       — golden rendered PNG (macOS ARM)
  output/                       — temporary output during test runs

vcs/server-render/canvex/
  canvex-skia/
    skia-config/canvex_skia_config_linux.sh   — Skia build configuration
    lib-static/linux-x64/libskia.a            — pre-built Skia static library
  src/canvex_skia_context.cpp                 — emoji rendering (drawEmojiWithPaint_)

vcs/res/fonts/NotoColorEmoji-Regular.ttf      — COLRv1 emoji font

.github/workflows/vcs-core-tests.yaml         — CI workflow (pinned to ubuntu-22.04)
Dockerfile.rtmp                                — production image (ubuntu:jammy)
```
