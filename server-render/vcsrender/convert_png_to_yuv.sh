infile=$1
if [ -z "$infile" ]; then
  echo "Error: argument must be input PNG file"
  exit 1
fi

set -e

ext=${infile##*.}
basefilename=$(basename "$infile" $ext)
outfile=$(dirname "$infile")/"$basefilename"yuv

ffmpeg -y -i "$infile" -pix_fmt yuv420p -update 1 "$outfile"

echo "\nOutput written to: $outfile"
