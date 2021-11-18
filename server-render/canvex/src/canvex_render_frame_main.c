#include "../include/canvex_c_api.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include <fcntl.h>

#include <png.h>

/*
  A minimal CLI renderer using the Canvex C API.

  Takes an image size + a JSON and produces a PNG.

  This program is useful for automated tests.
*/


static int writePNG_RGBA(
  const char *filename,
  int w,
  int h,
  const uint8_t *data,
  size_t rowBytes
) {
  if (w < 1 || h < 1) return 1;

  FILE *fp = fopen(filename, "wb");
  if(!fp) return 2;

  png_structp png = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
  png_infop info = png_create_info_struct(png);
  if (!png || !info) return 3;
  if (setjmp(png_jmpbuf(png))) return 3;

  png_init_io(png, fp);

  png_set_IHDR(
    png, info,
    w, h, 8,
    PNG_COLOR_TYPE_RGBA,
    PNG_INTERLACE_NONE,
    PNG_COMPRESSION_TYPE_DEFAULT,
    PNG_FILTER_TYPE_DEFAULT
  );
  png_write_info(png, info);

  png_bytep rowPointers[h];
  for (int i = 0; i < h; i++) {
    rowPointers[i] = (png_bytep)(data + i * rowBytes);
  }
  png_write_image(png, rowPointers);
  png_write_end(png, NULL);
  png_destroy_write_struct(&png, &info);

  fclose(fp);
  return 0;
}

/*
static int testWrite() {
  printf("Testing PNG write with a solid color...\n");

  // test PNG write
  int w = 640;
  int h = 480;
  int rowBytes = w * 4;
  uint8_t *buf = malloc(rowBytes * h);

  for (int y = 0; y < h; y++) {
    uint8_t *dst = buf + y * rowBytes;
    for (int x = 0; x < w; x++) {
      dst[0] = 255;
      dst[1] = 60;
      dst[2] = 0;
      dst[3] = 50;
      dst += 4;
    }
  }

  return writePNG_RGBA("testwrite.png", w, h, buf, rowBytes);
}
*/

int main(int argc, char *argv[]) {
  // return testWrite();

  if (argc < 5) {
    printf("Expected arguments: 1) image width, 2) image height, 3) input JSON path, 4) output PNG path.\n");
    return 1;
  }
  int w = strtol(argv[1], NULL, 10);
  int h = strtol(argv[2], NULL, 10);
  const char *jsonPath = argv[3];
  const char *pngPath = argv[4];

  if (w < 0 || h < 0 || w > 32768 || h > 32768) {
    printf("** Invalid image size specified (%d * %d).\n", w, h);
    return 1;
  }

  FILE* f = fopen(jsonPath, "r");
  if (!f) {
    printf("** Unable to open %s\n", jsonPath);
    return 1;
  }

  struct stat sb;
  stat(jsonPath, &sb);

  char *json = malloc(sb.st_size);
  fread(json, sb.st_size, 1, f);
  fclose(f); f = NULL;

  int rowBytes = w * 4;
  uint8_t *buf = malloc(rowBytes * h);

  CanvexResourceCtx ctx = CanvexResourceCtxCreate(NULL);

  CanvexRenderResult renderRes = CanvexRenderJSON_RGBA(
    ctx,
    json, strlen(json),
    buf, w, h, rowBytes
  );

  CanvexResourceCtxDestroy(ctx); ctx = NULL;
  free(json); json = NULL;

  if (CanvexRenderSuccess != renderRes) {
    printf("Render failed, error %d\n", renderRes);
    return renderRes;
  }

  writePNG_RGBA(pngPath, w, h, buf, rowBytes);

  return 0;
}

