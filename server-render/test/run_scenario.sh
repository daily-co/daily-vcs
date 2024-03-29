#!/bin/bash

arch=$(uname -m)

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  islinux=1
  platform="linux_skia_$arch"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  ismacos=1
  platform="macos_skia_$arch"
else
  echo "Unsupported platform $OSTYPE."
  exit 9
fi

set -e

name=$1
path="scenarios/$name"

echo "Starting scenario $name on platform $platform..."

# scenario setup
scenarioJsFile="$path/vcs-scenario.js"
if [ ! -f "$scenarioJsFile" ]; then
    echo "** Scenario setup file is missing at: $scenarioJsFile"
    exit 1
fi
# ensure absolute path
scenarioJsFile=$(cd "$(dirname "$scenarioJsFile")" && pwd)/$(basename "$scenarioJsFile")

# tmp location to hold output artifacts during test
tmpdir=$(pwd)/output/"$name"
mkdir -p "$tmpdir"
rm -rf "$tmpdir"/*

tmpOutputPrefix="$tmpdir/vcs-output"

( cd ../../js && yarn run test-scenario "$scenarioJsFile" --output "$tmpOutputPrefix" )

set +e # let all comparisons run
cmpErr=0

outputVideoLayersFiles="$tmpdir/*_videolayers.json"
for f in $outputVideoLayersFiles
do
  filename=$(basename $f)
  expjson="$path/$filename"

  # compare JSON with expected output
  cmp "$f" "$expjson"
  if [ $? -ne 0 ]; then
    cmpErr=1
  else
    echo "Output match: videoLayers JSON ($expjson)"
  fi

done

outputCanvexJsonFiles="$tmpdir/*.canvex.json"
for f in $outputCanvexJsonFiles
do
  filename=$(basename $f)
  filename=${filename%.*} # remove extension
  tmpimage="$tmpdir/$filename.$platform.png"
  expimage="$path/$filename.$platform.png"

  # ( cd ../canvex && build/canvex_render_frame 1280 720 "$f" "$tmpimage" )

  node canvex-render-frame-util.js ../canvex "$f" "$tmpimage"

  # compare rendered image with expected output
  cmp "$tmpimage" "$expimage"
  if [ $? -ne 0 ]; then
    cmpErr=1
  else
    echo "Output match: canvex-rendered graphics ($expimage)"
  fi
done

if [ $cmpErr -ne 0 ]; then
  echo "**** Scenario $name failed."
  exit 1
fi

echo "---- Scenario $name successful, rendering matches."
