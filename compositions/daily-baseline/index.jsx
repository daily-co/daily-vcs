import * as React from 'react';
import { Box, WebFrame } from '#vcs-react/components';
import {
  useParams,
  useGrid,
  useViewportSize,
  useVideoPlaybackState,
  PlaybackStateType,
} from '#vcs-react/hooks';

import {
  DEFAULT_FONT,
  DEFAULT_LABEL_FONT_SIZE_PX,
  DEFAULT_TOAST_FONT_SIZE_PX,
  fontFamilies,
} from './constants.js';
import { imagePreloads } from './preloads.js';
import { compositionParams } from './params.js';
import { useActiveVideoAndAudio } from './participants.js';
import * as layoutFuncs from './layouts.js';

import CustomOverlay from './components/CustomOverlay.js';
import ImageOverlay from './components/ImageOverlay.js';
import Toast from './components/Toast.js';
import TextOverlay from './components/TextOverlay.js';
import VideoDominant from './components/VideoDominant.js';
import VideoGrid from './components/VideoGrid.js';
import VideoPip from './components/VideoPip.js';
import VideoSingle from './components/VideoSingle.js';
import VideoSplit from './components/VideoSplit.js';
import Slate from './components/Slate.js';
import WebFrameOverlay from './components/WebFrameOverlay.js';

// -- the control interface exposed by this composition --
export const compositionInterface = {
  displayMeta: {
    name: 'Daily Baseline',
    description: "Composition with Daily's baseline features",
  },
  fontFamilies,
  imagePreloads,
  params: compositionParams,
};

// -- the root component of this composition --
export default function DailyBaselineVCS() {
  const params = useParams();
  const viewportSize = useViewportSize();
  const pxPerGu = useGrid().pixelsPerGridUnit;
  const guPerVh = viewportSize.h / pxPerGu;
  const guPerVw = viewportSize.w / pxPerGu;

  // style applied to video elements.
  // placeholder is used if no video is available.
  const videoStyle = {
    cornerRadius_px: params['videoSettings.roundedCorners']
      ? params['videoSettings.cornerRadius_gu'] * pxPerGu
      : 0,
  };
  const placeholderStyle = {
    fillColor: params['videoSettings.placeholder.bgColor'] || '#008',
    cornerRadius_px: videoStyle.cornerRadius_px,
  };
  const videoLabelStyle = {
    textColor: params['videoSettings.labels.color'] || 'white',
    fontFamily: params['videoSettings.labels.fontFamily'] || DEFAULT_FONT,
    fontWeight: params['videoSettings.labels.fontWeight'] || '600',
    fontSize_px: params['videoSettings.labels.fontSize_pct']
      ? (params['videoSettings.labels.fontSize_pct'] / 100) *
        DEFAULT_LABEL_FONT_SIZE_PX
      : DEFAULT_LABEL_FONT_SIZE_PX,
    strokeColor:
      params['videoSettings.labels.strokeColor'] || 'rgba(0, 0, 0, 0.9)',
    strokeWidth_px: 4,
  };

  // props passed to the video layout component
  const { participantDescs, dominantVideoId, hasScreenShare } =
    useActiveVideoAndAudio({
      maxCamStreams: params['videoSettings.maxCamStreams'],
      preferScreenshare: params['videoSettings.preferScreenshare'],
      omitPaused: params['videoSettings.omitPaused'],
    });

  const videoProps = {
    videoStyle,
    placeholderStyle,
    videoLabelStyle,
    participantDescs,
    dominantVideoId,
    preferScreenshare: params['videoSettings.preferScreenshare'],
    omitPaused: params['videoSettings.omitPaused'],
    showLabels: params['videoSettings.showParticipantLabels'],
    scaleMode: params['videoSettings.scaleMode'],
    labelsOffset_px: {
      x: params['videoSettings.labels.offset_x_gu']
        ? parseFloat(params['videoSettings.labels.offset_x_gu']) * pxPerGu
        : 0,
      y: params['videoSettings.labels.offset_y_gu']
        ? parseFloat(params['videoSettings.labels.offset_y_gu']) * pxPerGu
        : 0,
    },
  };
  // bw compatibility - check for deprecated param names using absolute px units instead of gu
  if (isFinite(params['videoSettings.labels.offset_x'])) {
    videoProps.labelsOffset_px.x = parseInt(
      params['videoSettings.labels.offset_x'],
      10
    );
  }
  if (isFinite(params['videoSettings.labels.offset_y'])) {
    videoProps.labelsOffset_px.y = parseInt(
      params['videoSettings.labels.offset_y'],
      10
    );
  }

  let mode = params.mode;
  if (
    mode === 'grid' &&
    params['videoSettings.grid.useDominantForSharing'] &&
    hasScreenShare
  ) {
    mode = 'dominant';
  }

  let video;
  switch (mode) {
    default:
    case 'single':
      video = <VideoSingle {...videoProps} />;
      break;
    case 'grid':
      video = (
        <VideoGrid
          {...videoProps}
          highlightDominant={params['videoSettings.grid.highlightDominant']}
          itemInterval_gu={params['videoSettings.grid.itemInterval_gu']}
          outerPadding_gu={params['videoSettings.grid.outerPadding_gu']}
        />
      );
      break;
    case 'split':
      video = (
        <VideoSplit
          margin_gu={params['videoSettings.split.margin_gu']}
          {...videoProps}
        />
      );
      break;
    case 'pip': {
      let h_gu;
      let margin_gu;
      // bw compatibility - deprecated params that used viewport height instead of gu
      if (isFinite(params['videoSettings.pip.height_vh'])) {
        h_gu = params['videoSettings.pip.height_vh'] * guPerVh;
      } else {
        h_gu = params['videoSettings.pip.height_gu'];
      }
      if (isFinite(params['videoSettings.pip.margin_vh'])) {
        margin_gu = params['videoSettings.pip.margin_vh'] * guPerVh;
      } else {
        margin_gu = params['videoSettings.pip.margin_gu'];
      }

      video = (
        <VideoPip
          {...videoProps}
          positionCorner={params['videoSettings.pip.position']}
          aspectRatio={params['videoSettings.pip.aspectRatio']}
          height_gu={h_gu}
          margin_gu={margin_gu}
          followDominantFlag={params['videoSettings.pip.followDomFlag']}
          disableRoundedCornersOnMain={
            params['videoSettings.pip.sharpCornersOnMain']
          }
        />
      );
      break;
    }
    case 'dominant': {
      // If we prefer screenshare but are following dominant, ignore the
      // dominant and use the first video (which will be a screenshare because
      // preferScreenshare is true)
      if (
        params['videoSettings.dominant.followDomFlag'] &&
        params['videoSettings.preferScreenshare'] &&
        hasScreenShare
      ) {
        videoProps.dominantVideoId = participantDescs[0].videoId;
      }

      video = (
        <VideoDominant
          {...videoProps}
          positionEdge={params['videoSettings.dominant.position']}
          splitPos={params['videoSettings.dominant.splitPos']}
          maxItems={params['videoSettings.dominant.numChiclets']}
          followDominantFlag={params['videoSettings.dominant.followDomFlag']}
          itemInterval_gu={params['videoSettings.dominant.itemInterval_gu']}
          outerPadding_gu={params['videoSettings.dominant.outerPadding_gu']}
          splitMargin_gu={params['videoSettings.dominant.splitMargin_gu']}
          disableRoundedCornersOnMain={
            params['videoSettings.dominant.sharpCornersOnMain']
          }
        />
      );
      break;
    }
  }

  let graphics = [];
  let gi = 0;
  if (params.showTextOverlay) {
    // copy params to props and ensure types are what the component expects
    let overlayProps = params.text ? { ...params.text } : {};

    // bw compatibility: deprecated params that used absolute coords rather than gu
    if (isFinite(overlayProps.offset_x)) {
      overlayProps.offset_x_gu = parseInt(overlayProps.offset_x, 10) / pxPerGu;
    } else {
      overlayProps.offset_x_gu = parseFloat(overlayProps.offset_x_gu);
    }
    if (isFinite(overlayProps.offset_y)) {
      overlayProps.offset_y_gu = parseInt(overlayProps.offset_y, 10) / pxPerGu;
    } else {
      overlayProps.offset_y_gu = parseFloat(overlayProps.offset_y_gu);
    }

    // bw compatibility: renamed param
    if (isFinite(overlayProps.rotationInDegrees)) {
      overlayProps.rotation_deg = parseFloat(overlayProps.rotationInDegrees);
    } else {
      overlayProps.rotation_deg = parseFloat(overlayProps.rotation_deg);
    }

    // bw compatibility: deprecated param that used view height rather than gu
    if (isFinite(overlayProps.fontSize_percentageOfViewH)) {
      overlayProps.fontSize_gu =
        (parseFloat(overlayProps.fontSize_percentageOfViewH) / 100) * guPerVh;
    } else {
      overlayProps.fontSize_gu = parseFloat(overlayProps.fontSize_gu);
    }

    overlayProps.color = overlayProps.color ? overlayProps.color.trim() : null;

    overlayProps.strokeColor = overlayProps.strokeColor
      ? overlayProps.strokeColor.trim()
      : null;
    overlayProps.useStroke =
      overlayProps.strokeColor && overlayProps.strokeColor.length > 0;

    graphics.push(<TextOverlay key={gi++} {...overlayProps} />);
  }

  {
    // image overlay
    let h_gu;
    let margin_gu;
    // bw compatibility - deprecated params that used viewport height instead of gu
    if (isFinite(params['image.height_vh'])) {
      h_gu = params['image.height_vh'] * guPerVh;
    } else {
      h_gu = params['image.height_gu'];
    }
    if (isFinite(params['image.margin_vh'])) {
      margin_gu = params['image.margin_vh'] * guPerVh;
    } else {
      margin_gu = params['image.margin_gu'];
    }

    graphics.push(
      <ImageOverlay
        key={gi++}
        src={params['image.assetName']}
        positionCorner={params['image.position']}
        fullScreen={params['image.fullScreen']}
        aspectRatio={params['image.aspectRatio']}
        height_gu={h_gu}
        margin_gu={margin_gu}
        opacity={params['image.opacity']}
        enableFade={params['image.enableFade']}
        show={params.showImageOverlay}
      />
    );
  }

  graphics.push(
    <WebFrameOverlay
      key={gi++}
      src={params['webFrame.url']}
      viewportWidth_px={params['webFrame.viewportWidth_px']}
      viewportHeight_px={params['webFrame.viewportHeight_px']}
      positionCorner={params['webFrame.position']}
      fullScreen={params['webFrame.fullScreen']}
      height_gu={params['webFrame.height_gu']}
      margin_gu={params['webFrame.margin_gu']}
      opacity={params['webFrame.opacity']}
      enableFade={params['webFrame.enableFade']}
      show={params.showWebFrameOverlay}
    />
  );

  graphics.push(
    <Toast
      key={gi++}
      numberOfLines={
        params['toast.numTextLines']
          ? parseInt(params['toast.numTextLines'], 10)
          : 2
      }
      currentItem={{
        key: params['toast.key'] ? parseInt(params['toast.key'], 10) : 0,
        text: params['toast.text'],
        showIcon: !!params['toast.showIcon'],
        iconOverrideAssetName: params['toast.icon.assetName'],
        durationInSeconds: params['toast.duration_secs']
          ? parseFloat(params['toast.duration_secs'])
          : 4,
      }}
      style={{
        fillColor: params['toast.color'],
        textColor: params['toast.text.color'] || 'white',
        fontFamily: params['toast.text.fontFamily'] || DEFAULT_FONT,
        fontWeight: params['toast.text.fontWeight'] || '500',
        fontSize_px: params['toast.text.fontSize_pct']
          ? (params['toast.text.fontSize_pct'] / 100) *
            DEFAULT_TOAST_FONT_SIZE_PX
          : DEFAULT_TOAST_FONT_SIZE_PX,
        strokeColor: params['toast.strokeColor'],
      }}
    />
  );

  // custom overlay is the topmost of non-fullscreen graphics.
  // it's empty by default (meant to be overridden in session assets).
  graphics.push(<CustomOverlay key={gi++} />);

  {
    // title slate (a fullscreen graphic)
    const titleStyle = {
      textColor: params['titleSlate.textColor'] || 'white',
      fontFamily: params['titleSlate.fontFamily'] || DEFAULT_FONT,
      fontWeight: params['titleSlate.fontWeight'] || '500',
      fontSize_gu: params['titleSlate.fontSize_gu'] || 2.5,
    };
    const subtitleStyle = {
      ...titleStyle,
      fontWeight: params['titleSlate.subtitle.fontWeight'] || '400',
    };
    if (isFinite(params['titleSlate.subtitle.fontSize_pct'])) {
      subtitleStyle.fontSize_gu *=
        params['titleSlate.subtitle.fontSize_pct'] / 100;
    }

    graphics.push(
      <Slate
        key={'titleslate_' + gi++}
        id="titleSlate"
        show={params['showTitleSlate']}
        src={params['titleSlate.bgImageAssetName']}
        bgColor={params['titleSlate.bgColor']}
        title={params['titleSlate.title']}
        subtitle={params['titleSlate.subtitle']}
        titleStyle={titleStyle}
        subtitleStyle={subtitleStyle}
      />
    );
  }

  // automatic opening slate, will be displayed at start of stream.
  const enableOpeningSlate = params['enableAutoOpeningSlate'];
  if (enableOpeningSlate) {
    const titleStyle = {
      textColor: params['openingSlate.textColor'] || 'white',
      fontFamily: params['openingSlate.fontFamily'] || DEFAULT_FONT,
      fontWeight: params['openingSlate.fontWeight'] || '500',
      fontSize_gu: params['openingSlate.fontSize_gu'] || 2.5,
    };
    const subtitleStyle = {
      ...titleStyle,
      fontWeight: params['openingSlate.subtitle.fontWeight'] || '400',
    };
    if (isFinite(params['openingSlate.subtitle.fontSize_pct'])) {
      subtitleStyle.fontSize_gu *=
        params['openingSlate.subtitle.fontSize_pct'] / 100;
    }

    graphics.push(
      <Slate
        key={'openingslate_' + gi++}
        id="openingSlate"
        show={true}
        isOpeningSlate={true}
        openingWaitTime={params['openingSlate.duration_secs']}
        src={params['openingSlate.bgImageAssetName']}
        bgColor={params['openingSlate.bgColor']}
        title={params['openingSlate.title']}
        subtitle={params['openingSlate.subtitle']}
        titleStyle={titleStyle}
        subtitleStyle={subtitleStyle}
      />
    );
  }

  // automatic closing slate based on stream playback slate.
  // currently this one isn't configurable because the server doesn't
  // send the postroll transition event.
  const inPostRoll = useVideoPlaybackState() === PlaybackStateType.POSTROLL;
  graphics.push(
    <Slate key={'closingslate_' + gi++} id="closingSlate" show={inPostRoll} />
  );

  // apply a layout function to the video container if non-zero margins specified
  let videoBoxLayout;
  const videoMargins_gu = {
    l: parseFloat(params['videoSettings.margin.left_gu']),
    r: parseFloat(params['videoSettings.margin.right_gu']),
    t: parseFloat(params['videoSettings.margin.top_gu']),
    b: parseFloat(params['videoSettings.margin.bottom_gu']),
  };
  // bw compatibility - deprecated params that use viewport dimensions instead of gu
  if (isFinite(params['videoSettings.margin.left_vw'])) {
    videoMargins_gu.l =
      parseFloat(params['videoSettings.margin.left_vw']) * guPerVw;
  }
  if (isFinite(params['videoSettings.margin.right_vw'])) {
    videoMargins_gu.r =
      parseFloat(params['videoSettings.margin.right_vw']) * guPerVw;
  }
  if (isFinite(params['videoSettings.margin.top_vh'])) {
    videoMargins_gu.t =
      parseFloat(params['videoSettings.margin.top_vh']) * guPerVh;
  }
  if (isFinite(params['videoSettings.margin.bottom_vh'])) {
    videoMargins_gu.b =
      parseFloat(params['videoSettings.margin.bottom_vh']) * guPerVh;
  }
  if (
    (isFinite(videoMargins_gu.l) && videoMargins_gu.l !== 0) ||
    (isFinite(videoMargins_gu.r) && videoMargins_gu.r !== 0) ||
    (isFinite(videoMargins_gu.t) && videoMargins_gu.t !== 0) ||
    (isFinite(videoMargins_gu.b) && videoMargins_gu.b !== 0)
  ) {
    videoBoxLayout = [layoutFuncs.pad, { pad_gu: videoMargins_gu }];
  }

  return (
    <Box id="main">
      <Box id="videoBox" layout={videoBoxLayout}>
        {video}
      </Box>
      <Box id="graphicsBox">{graphics}</Box>
    </Box>
  );
}
