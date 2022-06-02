import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as Path from 'path';

/*
  Utility that calls canvex_render_frame with the image size parsed from the input canvex JSON.
*/

let argn = 2;
const canvexPath = process.argv[argn++];
const jsonPath = process.argv[argn++];
const outputPath = process.argv[argn++];

if (!canvexPath || !jsonPath || !outputPath) {
  console.error(
    '** Invalid arguments: expected 1) canvex dir, 2) json path, 3) output path'
  );
  process.exit(1);
}

const json = fs.readFileSync(jsonPath, { encoding: 'utf8' });
const obj = JSON.parse(json);
const w = obj.width;
const h = obj.height;

if (!w || !h || w < 1 || h < 1) {
  console.error(
    "** Invalid JSON input: doesn't have valid width/height: ",
    jsonPath
  );
  process.exit(2);
}

const binPath = Path.resolve(canvexPath, 'build', 'canvex_render_frame');

execFileSync(
  binPath,
  [w, h, Path.resolve(jsonPath), Path.resolve(outputPath)],
  {
    cwd: canvexPath,
  }
);
