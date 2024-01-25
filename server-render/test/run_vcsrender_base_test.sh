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

# location to hold output artifacts during test
outputDirBase=$(pwd)/output/vcsrender_basetest
outputDir="$outputDirBase/render_yuv"

inputDir="/tmp/vcsrender-test-input-data"

# fetch test input sequences used for the render if needed
iseq1Dir="$inputDir/bunny_yuv_10s"
iseq2Dir="$inputDir/webcam_yuv"

if [[ ! -d "$iseq1Dir" || ! -d "$iseq2Dir" ]]; then
  echo "Will fetch test assets into $inputDir..."
  rm -rf "$inputDir"
  mkdir -p "$inputDir"

  pushd .
  cd "$inputDir"
  wget -q "https://daily-vcs-compositions.s3.us-east-2.amazonaws.com/example-assets/vcsrender_test_inputseqs_01.zip"

  echo "Finished wget of assets, will unzip"

  unzip -q vcsrender_test_inputseqs_01.zip
  popd

  if [[ ! -d "$iseq1Dir" || ! -d "$iseq2Dir" ]]; then
    echo "** Unzipped test_inputseqs didn't produce expected directories, can't proceed with test"
    exit 1
  fi
  echo "Finished unzip of assets, will run test"
fi

# render output
mkdir -p "$outputDir"
pushd .
cd ../vcsrender
./build/vcsrender --oseq "$outputDir" \
      --duration_frames 240 \
      --iw 1280 --ih 720 \
      --iseq "$iseq1Dir" \
      --iseq "$iseq2Dir"
popd

# compare with known good frames
comparisonFilesDir=$(pwd)/vcsrender/expected_basetest_render_yuv
comparisonFrames=("0100" "0200")

set +e # let all comparisons run
cmpErr=0

for f in ${comparisonFrames[@]}
do
  filename="vcsrenderout_$f"
  outimage="$outputDir/$filename.yuv"
  expimage="$comparisonFilesDir/$filename.$platform.yuv"

  cmp "$outimage" "$expimage"
  if [ $? -ne 0 ]; then
    cmpErr=1
  else
    echo "YUV output match: ($expimage)"
  fi
done

if [ $cmpErr -ne 0 ]; then
  echo "**** vcsrender base test failed, YUV output doesn't match."
  exit 1
fi

echo "---- vcsrender base test successful, YUV output matches."
