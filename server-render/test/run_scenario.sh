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
tmpdir="/tmp/vcs-test-run/$name"
mkdir -p "$tmpdir"
rm -rf "$tmpdir"/*

tmpOutputPrefix="$tmpdir/vcs-output"

( cd ../../js && yarn run test-scenario "$scenarioJsFile" --output "$tmpOutputPrefix" )

echo "VSC runner completed scenario execution. Will run canvex next."

outputJsonFiles="$tmpdir/*.json"
for f in $outputJsonFiles
do
  # TODO: support multiple frame comparisons
  # (expimage currently hardcoded to a single path)
  tmpimage="$tmpdir/fg.png"
  expimage="$path/fg.png"

  ( cd ../canvex && build/canvex_render_frame 1280 720 "$f" "$tmpimage" )

  # compare rendered image with expected output
  cmp "$tmpimage" "$expimage"

  echo "Image match for $expimage"
done

echo "---- Scenario $name successful, rendering matches."
