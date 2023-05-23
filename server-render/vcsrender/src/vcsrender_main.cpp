#include <cxx_argp/cxx_argp_application.h>
#include <iostream>
#include <optional>
#include <mutex>

#include "imageseq.h"
#include "sceneseq.h"
#include "yuv_compositor.h"
#include "yuvbuf.h"
#include "scenedesc.h"
#include "file_util.h"
#include "time_util.h"

/*

`vcsrender` is a low-level offline renderer for VCS compositions.

It expects its inputs as files, in specific formats:

  * YUV sequences for video inputs
  * Separate JSON files for video layer and foreground graphics scene descriptions

The VCS composition must be pre-processed into the aforementioned "vl + fg" JSON outputs.
The batch runner tool in VCS core can be used for this.
These JSON sequences can be sparse, i.e. frames without a file are allowed.
(If a JSON isn't updated, previous state persists to the next frame.)

Image sequences can't be sparse, they must contain all frames.

Additionally vcsrender loads VCS resources, e.g. composition and session assets,
from a path which by default is assumed to be `../../res` (due to Daily's internal repo structure).
This can be overridden on the CLI.


Usage example:

vcsrender --oseq [output_seq] \
          -w 1280 -h 720 \
          --duration_in_frames 300 \
          --iw 1920 --ih 1080 --iseq [path_to_input_seq1] \
          --iw 1280 --ih 720  --iseq [path_to_input_seq2] \
          --jsonseq [path_to_scene_json_seq]
*/


CXX_ARGP_APPLICATION_BOILERPLATE;


using namespace vcsrender;


class VcsRenderApp : public cxx_argp::application
{
  // state provided by CLI args
  struct {
    // output settings
    std::string outputSeqPath;
    int outputW = 1920;
    int outputH = 1080;
    size_t durationInFrames = 100;

    std::string inputJsonSeqPath;

    std::vector<std::shared_ptr<ImageSequence>> inputSeqs;    
    std::vector<SceneDescAtFrame> sceneDescs;
    std::unique_ptr<SceneJsonSequence> inputJsonSeq;
  } args_;

  // state during arg parsing
  struct {
    // tracks the --iw and --ih arguments
    int inputW = 1920;
    int inputH = 1080;
  } argsParseState_;

  // render state
  std::unique_ptr<YuvCompositor> comp_;
  std::filesystem::path outputSeqDir_;

  size_t sceneDescCursor_ = 0;


  bool check_arguments() override
  {
    if (args_.outputSeqPath.empty()) {
      std::cerr << "Must provide output path" << std::endl;
      return false;
    }
    // TODO: check that output path exists and is a directory

    if (args_.durationInFrames < 1) {
      std::cerr << "Duration in frames must be >0" << std::endl;
      return false;
    }
    /*
    if (args_.inputJsonSeqPath.empty()) {
      std::cerr << "Must provide input JSON sequence path" << std::endl;
      return false;
    }*/

    return true;
  }

  int main() override {  
    outputSeqDir_ = args_.outputSeqPath;

    const std::string canvexResDir = "";
    comp_ = std::make_unique<YuvCompositor>(args_.outputW, args_.outputH, canvexResDir);

    if (args_.inputSeqs.empty()) {
      // DEBUG: add a bunch of Big Buck Bunnies as test inputs
      const auto bunnyDir = "example-data/temp/bunny_yuv_15s";
      const int numTestInputs = 16;
      for (int i = 0; i < numTestInputs; i++) {
        args_.inputSeqs.push_back(
          ImageSequence::createFromDir(bunnyDir, 1280, 720)
        );
      }
    }

    if (args_.inputJsonSeqPath.empty()) {
      // DEBUG: load some test JSONs
      std::string videoLayersJson_test_2inputs = R"(
        [ {"type":"video","id":0,"frame":{"x":0,"y":0,"w":960,"h":1080},"attrs":{"scaleMode":"fill"}},
          {"type":"video","id":1,"frame":{"x":960,"y":100,"w":960,"h":540},"attrs":{"scaleMode":"fill"}} ]
      )";
      std::string videoLayersJson_test_16inputs = readTextFile("example-data/vl_16inputs_720.json");

      std::string fgJson_test_roundedSidebar = readTextFile("subprojects/canvex/example-data/rounded-sidebar.json");
      std::string fgJson_test_basicLowerThird = readTextFile("subprojects/canvex/example-data/basic-lowerthird.json");

      args_.sceneDescs.push_back(
        {0,
        std::make_unique<std::string>(videoLayersJson_test_2inputs),
        std::make_unique<std::string>(fgJson_test_basicLowerThird)}
      );
      args_.sceneDescs.push_back(
        {(size_t)(args_.durationInFrames / 2),
        std::make_unique<std::string>(videoLayersJson_test_16inputs),
        std::make_unique<std::string>(fgJson_test_roundedSidebar),
        args_.outputW / 1280.0  // this vl json uses 1280x720 format, so scale accordingly
        }
      );
    }
    else {
      args_.inputJsonSeq = SceneJsonSequence::createFromDir(args_.inputJsonSeqPath);
    }

    return renderLoop();
  }

  int renderLoop() {
    double renderTimeAcc_s = 0.0;

    for (size_t frameIdx = 0; frameIdx < args_.durationInFrames; frameIdx++) {
      const auto dstPath = makeOutputFilePath(frameIdx);

      SceneDescAtFrame readSd;
      SceneDescAtFrame* sd = nullptr;
      if (args_.inputJsonSeq) {
        // read given json sequence
        readSd = args_.inputJsonSeq->readJsonForFrame(frameIdx);
        readSd.layerScale = 1920.0 / 1280.0;
        sd = &readSd;
      } else if (args_.sceneDescs.size() > 0) {
        // no json sequence but there are cached scenedescs in memory
        if (sceneDescCursor_ < args_.sceneDescs.size()
          && args_.sceneDescs[sceneDescCursor_].index == frameIdx) {
          sd = &(args_.sceneDescs[sceneDescCursor_++]);
        }
      }

      if (sd && (sd->json_vl || sd->json_fg)) {
        std::cout << "applying scene desc at frame " << frameIdx << std::endl;

        const double t0 = getMonotonicTime();

        if (sd->json_vl) {
          comp_->setVideoLayersJSON(*sd->json_vl, sd->layerScale);
        }
        if (sd->json_fg) {
          comp_->setFgDisplayListJSON(*sd->json_fg);
        }

        const double timeSpent_sceneDescJson = getMonotonicTime() - t0;
        std::cout << "  .. time spent on scenedesc json parsing: " << (timeSpent_sceneDescJson * 1000) << " ms" << std::endl;
      }

      // load inputs
      VideoInputBufsById inputBufs {};
      const int numInputs = args_.inputSeqs.size();
      for (int i = 0; i < numInputs; i++) {
        // note that video input ids start from #0.
        // they could be any integers, but this is the convention used by the scene desc JSONs
        // generated by the VCS batch runner.
        inputBufs[i] = args_.inputSeqs[i]->readYuv420ForFrame(frameIdx);
      }

      std::cout << "-- rendering frame " << frameIdx << "..." << std::endl;

      const double t0 = getMonotonicTime();

      auto renderResult = comp_->renderFrame(frameIdx, inputBufs);

      const double timeSpent_render = getMonotonicTime() - t0;

      if (frameIdx > 0) {
        renderTimeAcc_s += timeSpent_render;
      }

      std::cout << "  render time " << (timeSpent_render * 1000) << " ms, writing..." << std::endl;

      auto dstFile = fopen(dstPath.c_str(), "wb");
      fwrite(renderResult->data, renderResult->dataSize, 1, dstFile);
      fclose(dstFile);

      if (interrupted()) break;
    }

    std::cout << "\nAvg render time: " << (renderTimeAcc_s / (args_.durationInFrames - 1) * 1000) << " ms" << std::endl;

    if (interrupted()) {
      std::cerr << "Interrupted." << std::endl;
      return 1;
    }
    return 0;
  }

  std::filesystem::path makeOutputFilePath(size_t frameIdx) {
    const int numDigits = 4;
    const std::string fileExt = "yuv";

    std::stringstream fileNameSs;
    fileNameSs << "bunnyout_";
    fileNameSs << std::setfill('0') << std::setw(numDigits) << frameIdx;
    fileNameSs << "." << fileExt;

    return outputSeqDir_ / fileNameSs.str();
  }

public:
  VcsRenderApp() {
    arg_parser.add_option({"oseq",
                           'o', "output-sequence-path", 0,
                           "Output YUV sequence path", 0},
                          args_.outputSeqPath);

    arg_parser.add_option({"jsonseq",
                           'j', "input-json-sequence-path", 0,
                           "Input scene JSON sequence path", 0},
                          args_.inputJsonSeqPath);

    arg_parser.add_option({nullptr,
                           'w', "output-w", 0,
                           "Output image width", 0},
                          args_.outputW);

    arg_parser.add_option({nullptr,
                           'h', "output-h", 0,
                           "Output image height", 0},
                          args_.outputH);

    arg_parser.add_option({"duration_frames",
                           'd', "output-num-frames", 0,
                           "Output duration in frames", 0},
                          args_.durationInFrames);

    arg_parser.add_option({"iw",
                           1000, "input-w", 0,
                           "Input width applied to next --iseq argument", 0},
                           [this] (const char *argStr) {
                             int v = std::atoi(argStr);
                             if (v < 0 || v > 32768) {
                               std::cerr << "--iw argument out of bounds: " << argStr << std::endl;
                               return false;
                             }
                             std::cout << "iw " << v << std::endl;
                             argsParseState_.inputW = v;
                             return true;
                            }
                          );

    arg_parser.add_option({"ih",
                           1001, "input-h", 0,
                           "Input height applied to next --iseq argument", 0},
                           [this] (const char *argStr) {
                            int v = std::atoi(argStr);
                            if (v < 0 || v > 32768) {
                              std::cerr << "--ih argument out of bounds: " << argStr << std::endl;
                             return false;
                            }
                            std::cout << "ih " << v << std::endl;
                            argsParseState_.inputH = v;
                            return true;
                           }
                          );

    arg_parser.add_option({"iseq",
                           'i', "input-yuv-sequence-path", 0,
                           "Input YUV sequence path", 0},
                           [this] (const char *argStr) {
                            std::cout << "Loading input " << args_.inputSeqs.size() << ", size " << 
                                argsParseState_.inputW << "*" << argsParseState_.inputH << std::endl;
                            args_.inputSeqs.push_back(
                              ImageSequence::createFromDir(argStr, argsParseState_.inputW, argsParseState_.inputH)
                            );
                            return true;
                           }
                          );
  }
};

int main(int argc, char *argv[])
{
  return VcsRenderApp()(argc, argv);
}