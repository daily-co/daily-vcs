#!/bin/bash

set -e

name=$1
path="scenarios/$name"

echo "Starting scenario $name..."

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

echo "VSC runner completed scenario execution. Will run canvex next."

outputCanvexJsonFiles="$tmpdir/*.canvex.json"
for f in $outputCanvexJsonFiles
do
  filename=$(basename $f)
  filename=${filename%.*} # remove extension
  tmpimage="$tmpdir/$filename.png"
  expimage="$path/$filename.png"

  ( cd ../canvex && build/canvex_render_frame 1280 720 "$f" "$tmpimage" )

  # compare rendered image with expected output
  cmp "$tmpimage" "$expimage"

  echo "Output match: rendered graphics ($expimage)"
done

outputVideoLayersFiles="$tmpdir/*_videolayers.json"
for f in $outputVideoLayersFiles
do
  filename=$(basename $f)
  expjson="$path/$filename"

  # compare JSON with expected output
  cmp "$f" "$expjson"

  echo "Output match: videoLayers JSON ($expjson)"
done

echo "---- Scenario $name successful, rendering matches."
