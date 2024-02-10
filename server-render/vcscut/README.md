# VCSCut

VCSCut is an editing tool that takes in clip descriptions in a JSON format (`vcscut.json` a.k.a. the cut file) and produces intermediates that can be passed to the two tools that complete the render process:

* The VCS batch runner runs the actual React state, triggers the frame-specific events described by VCSCut output, and writes a "baked" scene description.
* VCSRender combines the baked scene description and the decoded video inputs by VCSCut, and produces an output YUV sequence.

If the cut file contains an audio description, VCSCut will write the mixed audio into its output directory.

## Installation

This is a Node.js script. But there are no npm dependencies, so nothing to install.

You do need to have ffmpeg available in path.

## Example

Here's an example usage of VCSCut.

Note that running this example requires this file to be present: example-data/sources/wasteland_ponies_footage.mp4
Will provide a better example soon.

There will also be an orchestration script that performs all these steps at once.

```
# in vcs/server-render/vcscut dir
node cut.js -i example-data/wasteland_ponies_reel.vcscut.json --w 1080 --h 1920 --fps 30

# in vcs/js dir
node vcs-batch-runner.js --events_json ../server-render/vcscut/cut-tmp/cut.vcsevents.json --output_prefix build/wasteland_cut/wasteland_cut --clean_output_dir

# in vcs/server-render/vcsrender dir
rm -rf example-data/temp/testrender_yuv/*
build/vcsrender --oseq example-data/temp/testrender_yuv --input_timings ../vcscut/cut-tmp/cut.vcsinputtimings.json --jsonseq ../../js/build/wasteland_cut -w 1080 -h 1920

./convert_yuvseq_to_movie.sh example-data/temp/testrender_yuv 1080x1920 30 example-data/temp/wasteland.mp4

# combine rendered video and audio previously written by cut tool
ffmpeg -i example-data/temp/wasteland.mp4 -i ../vcscut/cut-tmp/cut_audio_mix.m4a -c copy -map 0:0 -map 1:0 example-data/temp/wasteland_sound.mp4 -y

# finished output is now in: example-data/temp/wasteland_sound.mp4
```
