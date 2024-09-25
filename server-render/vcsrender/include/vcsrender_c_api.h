#ifndef __VCSRENDER_C_API_H__
#define __VCSRENDER_C_API_H__ 1

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
  VcsRenderSuccess = 0,
  VcsRenderError_InvalidArgument_JSONInput,
  VcsRenderError_InvalidArgument_ImageOutput,
  VcsRenderError_InvalidArgument_ResourcePath,
  VcsRenderError_InvalidArgument_Render,
  VcsRenderError_JSONParseFail,
  VcsRenderError_GraphicsUnspecifiedError = 1024
} VcsRenderResult;

typedef void *VcsRenderCtx;

/*
  A render context must be created for any render operations.
  It should be reused between frames and only updated if the input arguments have changed.
*/
VcsRenderCtx VcsRenderCtxCreate(
  uint32_t w,
  uint32_t h,
  const char *resourceDir
);
void VcsRenderCtxDestroy(VcsRenderCtx);

VcsRenderResult VcsRenderCtxUpdateVideoLayersJSON(
  VcsRenderCtx ctx,
  const char *json
);

VcsRenderResult VcsRenderCtxUpdateFgDisplayListJSON(
  VcsRenderCtx ctx,
  const char *json
);


typedef struct {
  uint32_t w;
  uint32_t h;
  uint8_t* data;
  uint32_t rowbytes_y;
  uint32_t rowbytes_ch;
} VcsBufferYuv420Planar;

typedef struct {
  uint32_t input_id;  // a value of 0 indicates this input isn't active and can't be rendered
  VcsBufferYuv420Planar buffer;
} VcsVideoInputData;

// utility that computes the rowbytes values when `w` is already set,
// and returns the allocation size needed for `data`
size_t VcsBufferComputeDataSizeAndSetRowBytesYuv420Planar(VcsBufferYuv420Planar *buf);


/*
  Returns a VcsRenderResult value (0 on success or an error id).
*/
VcsRenderResult VcsRenderYuv420Planar(
  VcsRenderCtx ctx,
  uint64_t frameIndex,
  VcsBufferYuv420Planar *dstBuf,
  const VcsVideoInputData *inputBufs,
  size_t numInputBufs
);


#ifdef __cplusplus
}
#endif

#endif
