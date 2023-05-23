size=$1
if [ -z "$size" ]; then
  echo "Error: first argument must be image size (e.g. 1280x720)"
  exit 1
fi

infile=$2
if [ -z "$infile" ]; then
  echo "Error: second argument must be input YUV file"
  exit 1
fi

set -e

ext=${infile##*.}
basefilename=$(basename "$infile" $ext)
outfile=$(dirname "$infile")/"$basefilename"png

ffmpeg -y -f rawvideo -s "$size" -i "$infile"  -update 1 "$outfile"

echo "\nOutput written to: $outfile"
