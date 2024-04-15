## Installation

Standard Node.js:

```
npm install
```

Some of these scripts use `zx` which is a Node scripting utility created by Google. It's invoked with `npx zx` in these examples.


## Other dependencies

VCS components:

* Install the VCS main JS components in `vcs/js`:
  `yarn install`

* To produce final renders, the VCSRender binary tool must be built in `vcs/server-render/vcsrender`.
  See instructions in the README in that folder for how to build.

Other:

* FFmpeg must be present in path.

* For trancripts, you need a Deepgram API key.

* Daily's `python-raw-tracks-align` must be present. You can provide its path using the `--raw-tracks-align-tool-path` argument (see below).
  Get the repo from: https://github.com/kwindla/python-raw-tracks-align


## Creating cuts from raw-tracks recordings

To process a folder of raw-tracks files interactively:

```
npx zx prepare-raw-tracks-for-cut.zx.mjs \
  --deepgram-api-key [YOUR API KEY] \
  -i [PATH CONTAINING RAW-TRACKS FILES]
```

You can also pass the Deepgram API key using the env var `DEEPGRAM_API_KEY` instead.

By default, output goes to a `processed` subdirectory under the input. You can override with `-o` argument.

Additional options:

* You can specify the location of the `python-raw-tracks-align` tool:
  `--raw-tracks-align-tool-path [PATH]`

* You can specify the Python binary used to execute the raw-tracks-align tool, e.g.:
  `--python-cmd python3.11`

* You can entirely skip the raw-tracks-align transcoding, if you have those files already in the right place:
  `--skip-transcode` 

The tool will guide you through the process. The steps are also described below.


## The steps

Here's the process of creating a VCS-edited clip using these transcript tools:

1. (CLI) Run `prepare-raw-tracks-for-cut` (see above). It converts the raw-tracks files to an aligned format, prompts you for some information about the participants, calls Deepgram for the transcript, and tells you what to do next.

2. (Browser) The previous step will typically have opened `gui/transcript-extract.html` in the browser for you. Drop in the transcript JSON file produced by the previous step. Choose a section of the transcript and click on the button that copies the JSON in the quoted CLI format.

3. (CLI) Run `gen-cut-from-raw-tracks`. Instructions were provided at the end of step 1. You need to paste in the JSON you copied in step 2.

  Example invocation: `node gen-cut-from-raw-tracks.js -v social-interview -i [YOUR FILES] -j [YOUR JSON]`
  
  The "social-interview" visual template is specified here. You will be asked some questions to fill out the template. (See below for changing the template.)

4. (CLI) Run `vcscut-render` with the cutfile path provided by step 3.

  Example invocation: `npx zx vcscut-render.zx.mjs -i [YOUR CUTFILE] --output-suffix _portrait -w 1080 -h 1920`


## Creating landscape and portrait versions

The output size is specified at the last step above. You can pass in a suffix for the output file, e.g:

```
npx zx vcscut-render.zx.mjs -w 1080 -h 1920 --output-suffix _portrait -i [YOUR CUTFILE]
```

And for landscape:

```
npx zx vcscut-render.zx.mjs -w 1920 -h 1080 --output-suffix _landscape -i [YOUR CUTFILE]
```


## Visual templates

Templates are JavaScript plugins located in the `visual-template-plugins` folder.

You pass in the name of a template using the `-v` argument to the `gen-cut-from-raw-tracks` tool.
