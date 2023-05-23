infile=$1
if [ -z "$infile" ]; then
  echo "Error: first argument must be input file"
  exit 1
fi

outfileprefix=$2
if [ -z "$outfileprefix" ]; then
  echo "Error: second argument must be output directory and file prefix for YUV sequence"
  exit 1
fi

duration=$3
# duration must be in ffmpeg acceptable timecode, e.g. "00:30" for 30 seconds

set -e

outdir="$(dirname "$outfileprefix")"

mkdir -p "$outdir"

ffargs=( "-i" "${infile}" \
  "-pix_fmt" "yuv420p" "-f" "segment" "-segment_time" "0.01" )

[[ -n "$duration" ]] && ffargs+=("-t" "${duration}")

ffargs+=("${outfileprefix}_%06d.yuv")

ffmpeg ${ffargs[@]}
