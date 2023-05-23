indir=$1
if [ -z "$indir" ]; then
  echo "Error: argument 1 must be input directory containing YUV sequence"
  exit 1
fi

isize=$2
if [ -z "$isize" ]; then
  echo "Error: argument 2 must be input size (e.g. 1280x720)"
  exit 1
fi

fps=$3
if [ -z "$fps" ]; then
  echo "Error: argument 3 must be frame rate"
  exit 1
fi

outfile=$4
if [ -z "$outfile" ]; then
  echo "Error: argument 4 must be destination movie file"
  exit 1
fi

set -e

rm -f "$outfile"

# ffmpeg's input image sequence syntax doesn't work for yuv files.
# instead we need to use cat to feed the raw video frames.

cat "$indir"/*.yuv | ffmpeg -f rawvideo -s "$isize" -r "$fps" -pix_fmt yuv420p -i - -c:v libx264 "$outfile"
