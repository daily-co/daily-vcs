#!/bin/bash

if [[ $# -ne 1 ]]; then
    echo "First argument must be scenario name."
    exit 2
fi

name=$1

echo "This will run scenario '$name' and copy the output into the repo,"
echo "replacing any previous files."
echo "After running this script, the scenario will pass because the"
echo "golden frames have been replaced."
echo "So, you should make sure to inspect the golden frames in the repo"
echo "and make sure they look right before you commit these changes."
echo
read -p "Are you sure? " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# clean the output folder first
outputDir="output/$name"
rm -rf "$outputDir"

./run_scenario.sh "$name" > /dev/null

# copy new output to repo
dstDir="scenarios/$name"
cp "$outputDir"/*.png "$dstDir"
cp "$outputDir"/*_videolayers.json "$dstDir"
