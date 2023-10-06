import * as React from 'react';
import { Box } from '#vcs-react/components';
import {
  useParams,
  useStandardSources,
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
import * as layoutFuncs from './layouts.js';
import { imagePreloads } from './preloads.js';
import { compositionParams } from './params.js';
import { useActiveVideoAndAudio } from './participants.js';
import { usePreferredParticipantIdsParam } from './preferred-video-ids.js';

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
import RoomDebug from './components/RoomDebug.js';
import LowerThird from './components/LowerThird.js';

// -- the control interface exposed by this composition --
export const compositionInterface = {
  displayMeta: {
    name: 'Daily Baseline',
    description: "Composition with Daily's baseline features",
  },
  standardSources: ['chatMessages', 'transcript'],
  fontFamilies,
  imagePreloads,
  params: compositionParams,
};

// -- the root component of this composition --
export default function DailyBaselineVCS() {
  const params = useParams();
  const standardSources = useStandardSources();
  const viewportSize = useViewportSize();
  const pxPerGu = useGrid().pixelsPerGridUnit;
  const guPerVh = viewportSize.h / pxPerGu;
  const guPerVw = viewportSize.w / pxPerGu;

  // style applied to video elements.
  // placeholder is used if no video is available.
  const styles = React.useMemo(() => {
    const cornerRadius_px = params['videoSettings.roundedCorners']
      ? params['videoSettings.cornerRadius_gu'] * pxPerGu
      : 0;
    return {
      video: {
        cornerRadius_px,
        highlightColor: params['videoSettings.highlight.color'] || '#fff',
        highlightStrokeWidth_px: params['videoSettings.highlight.stroke_gu']
          ? params['videoSettings.highlight.stroke_gu'] * pxPerGu
          : 4,
      },
      placeholder: {
        fillColor: params['videoSettings.placeholder.bgColor'] || '#008',
        cornerRadius_px,
      },
      videoLabel: {
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
      },
    };
  }, [params]);

  // this param's name was changed; also check the old name for backwards compatibility.
  const omitPausedVideo =
    params['videoSettings.omitPausedVideo'] != null
      ? params['videoSettings.omitPausedVideo']
      : params['videoSettings.omitPaused'];

  // props passed to the video layout component.
  let { participantDescs, dominantVideoId, hasScreenShare } =
    useActiveVideoAndAudio({
      maxCamStreams: params['videoSettings.maxCamStreams'],
      preferScreenshare: params['videoSettings.preferScreenshare'],
      omitPausedVideo,
      omitAudioOnly: params['videoSettings.omitAudioOnly'],
      omitExtraScreenshares: params['videoSettings.omitExtraScreenshares'],
    });

  const { preferredVideoIds, includeOtherVideoIds } =
    usePreferredParticipantIdsParam(params, dominantVideoId, hasScreenShare);

  participantDescs = React.useMemo(() => {
    let arr = participantDescs.slice();
    const pref = [];
    for (const videoId of preferredVideoIds) {
      const idx = arr.findIndex((d) => d.videoId === videoId);
      if (idx >= 0) {
        const d = arr[idx];
        pref.push(d);
        arr.splice(idx, 1);
      }
    }
    return includeOtherVideoIds ? pref.concat(arr) : pref;
  }, [participantDescs, preferredVideoIds, includeOtherVideoIds]);

  // we can memoize the video layout root component because it doesn't call useVideoTime()
  // (i.e. doesn't render animations by explicitly modifying component props)
  const video = React.useMemo(() => {
    const videoProps = {
      videoStyle: styles.video,
      placeholderStyle: styles.placeholder,
      videoLabelStyle: styles.videoLabel,
      participantDescs,
      dominantVideoId,
      preferScreenshare: params['videoSettings.preferScreenshare'],
      showLabels: params['videoSettings.showParticipantLabels'],
      scaleMode: params['videoSettings.scaleMode'],
      scaleModeForScreenshare: params['videoSettings.scaleModeForScreenshare'],
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
            preserveItemAspectRatio={
              params['videoSettings.grid.preserveAspectRatio']
            }
          />
        );
        break;
      case 'split':
        video = (
          <VideoSplit
            margin_gu={params['videoSettings.split.margin_gu']}
            splitDirection={params['videoSettings.split.direction']}
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
    return video;
  }, [params, styles, participantDescs, dominantVideoId, hasScreenShare]);

  let bgGraphics = [];
  let graphics = [];

  if (params.showTextOverlay) {
    // copy params to props and ensure types are what the component expects
    let overlayProps = params.text ? { ...params.text } : {};

    if (params.text?.source === 'param') {
      // default
    } else if (params.text?.source === 'agenda') {
      const agendaPos = params['agenda.position'] || 0;
      const agendaItems = parseCommaSeparatedList(
        params['agenda.items']
      ).filter((s) => s.length > 0);

      overlayProps.highlightRows = {
        textRows: agendaItems,
        highlightIndex: agendaPos,
      };
    } else {
      const ssrc = standardSources[params.text?.source];
      if (!ssrc) {
        console.error(
          '** Invalid standard source requested by param text.source: ',
          params.text.source
        );
      } else {
        let text = '';
        if (ssrc.latest.length > 0) {
          const msg = ssrc.latest.at(ssrc.latest.length - 1);
          if (msg.senderDisplayName?.length > 0) {
            text += `[${msg.senderDisplayName}] `;
          }
          text += msg.text;
        }
        overlayProps.content = text;
      }
    }

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

    overlayProps.scale_x = isFinite(overlayProps.scale_x)
      ? parseFloat(overlayProps.scale_x)
      : 1;

    overlayProps.color = overlayProps.color ? overlayProps.color.trim() : null;

    overlayProps.strokeColor = overlayProps.strokeColor
      ? overlayProps.strokeColor.trim()
      : null;

    overlayProps.strokeWidth_px = overlayProps.stroke_gu
      ? overlayProps.stroke_gu * pxPerGu
      : 12;

    overlayProps.useStroke =
      overlayProps.strokeColor &&
      overlayProps.strokeColor.length > 0 &&
      overlayProps.strokeWidth_px > 0;

    overlayProps.highlightColor = params['text.highlight.color'];
    overlayProps.highlightFontWeight = params['text.highlight.fontWeight'];

    graphics.push(<TextOverlay key="textOverlay" {...overlayProps} />);
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

    const arr =
      params['image.zPosition'] === 'foreground' ? graphics : bgGraphics;

    arr.push(
      <ImageOverlay
        key="imageOverlay"
        src={params['image.assetName']}
        positionCorner={params['image.position']}
        fullScreen={params['image.fullScreen']}
        fullScreenScaleMode={params['image.fullScreenScaleMode']}
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
      key="webFrameOverlay"
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
      keyPressActionKey={params['webFrame.keyPress.key']}
      keyPressActionName={params['webFrame.keyPress.keyName']}
      keyPressModifiers={params['webFrame.keyPress.modifiers']}
    />
  );

  // lower third
  {
    let title = '',
      subtitle = '';
    if (params.lowerThird.source === 'param') {
      title = params['lowerThird.title'];
      subtitle = params['lowerThird.subtitle'];
    } else if (params.lowerThird.source === 'agenda') {
      const agendaPos = params['agenda.position'] || 0;
      const agendaItems = parseCommaSeparatedList(
        params['agenda.items']
      ).filter((s) => s.length > 0);

      if (agendaPos >= 0 && agendaPos < agendaItems.length) {
        title = `Now: ${agendaItems[agendaPos]}`;

        if (agendaPos < agendaItems.length - 1) {
          subtitle = `Next: ${agendaItems[agendaPos + 1]}`;
        }
      }
    } else {
      const ssrc = standardSources[params.lowerThird.source];
      if (!ssrc) {
        console.error(
          '** Invalid standard source requested by param lowerThird.source: ',
          params.lowerThird.source
        );
      } else if (ssrc.latest.length > 0) {
        const msg = ssrc.latest.at(ssrc.latest.length - 1);
        title = msg.senderDisplayName || '';
        subtitle = msg.text || '';
      }
    }

    const strokeWidth_px =
      params['lowerThird.stroke_gu'] > 0
        ? params['lowerThird.stroke_gu'] * pxPerGu
        : 0;
    const textStrokeWidth_px =
      params['lowerThird.text.stroke_gu'] > 0
        ? params['lowerThird.text.stroke_gu'] * pxPerGu
        : 0;

    graphics.push(
      <LowerThird
        key="lowerThird"
        title={title}
        subtitle={subtitle}
        enableFade={true}
        show={params.showLowerThirdOverlay}
        positionCorner={params['lowerThird.position']}
        marginX_gu={params['lowerThird.margin_x_gu']}
        marginY_gu={params['lowerThird.margin_y_gu']}
        renderAtMaxWidth={!!params['lowerThird.alwaysUseMaxW']}
        maxWidth_pct={{
          default: parseFloat(params['lowerThird.maxW_pct_default']),
          portrait: parseFloat(params['lowerThird.maxW_pct_portrait']),
        }}
        rotate_deg={parseFloat(params['lowerThird.rotation_deg'])}
        showIcon={params['lowerThird.showIcon']}
        iconSize_gu={parseFloat(params['lowerThird.icon.size_gu'])}
        iconOverrideAssetName={params['lowerThird.icon.assetName']}
        pad_gu={parseFloat(params['lowerThird.pad_gu'])}
        bgStyle={{
          fillColor: params['lowerThird.color'],
          strokeColor: params['lowerThird.strokeColor'],
          strokeWidth_px,
          cornerRadius_px:
            parseFloat(params['lowerThird.cornerRadius_gu']) * pxPerGu,
        }}
        textStyle={{
          strokeWidth_px: textStrokeWidth_px,
          strokeColor: params['lowerThird.text.strokeColor'],
          textColor: params['lowerThird.text.color'] || 'white',
          fontFamily: params['lowerThird.text.fontFamily'] || DEFAULT_FONT,
        }}
        titleStyle={{
          fontSize_gu: params['lowerThird.title.fontSize_gu'],
          fontWeight: params['lowerThird.title.fontWeight'],
          fontStyle: params['lowerThird.title.fontStyle'],
        }}
        subtitleStyle={{
          fontSize_gu: params['lowerThird.subtitle.fontSize_gu'],
          fontWeight: params['lowerThird.subtitle.fontWeight'],
          fontStyle: params['lowerThird.subtitle.fontStyle'],
        }}
      />
    );
  }

  // toast source
  let toastKey = 0,
    toastText = '';
  if (params.toast?.source === 'param') {
    toastKey = params['toast.key'] ? parseInt(params['toast.key'], 10) : 0;
    toastText = params['toast.text'];
  } else if (params.toast) {
    const ssrc = standardSources[params.toast.source];
    if (!ssrc) {
      console.error(
        '** Invalid standard source requested by param toast.source: ',
        params.toast.source
      );
    } else if (ssrc.latest.length > 0) {
      const msg = ssrc.latest.at(ssrc.latest.length - 1);
      toastKey = msg.key;
      toastText = msg.text;
    }
  }
  graphics.push(
    <Toast
      key="toast"
      currentItem={{
        key: toastKey,
        text: toastText,
        showIcon: !!params['toast.showIcon'],
        iconOverrideAssetName: params['toast.icon.assetName'],
        durationInSeconds: params['toast.duration_secs']
          ? parseFloat(params['toast.duration_secs'])
          : 4,
      }}
      iconSize_gu={parseFloat(params['toast.icon.size_gu'])}
      maxWidth_pct={{
        default: parseFloat(params['toast.maxW_pct_default']),
        portrait: parseFloat(params['toast.maxW_pct_portrait']),
      }}
      style={{
        fillColor: params['toast.color'],
        textColor: params['toast.text.color'] || 'white',
        strokeColor: params['toast.strokeColor'],
        fontFamily: params['toast.text.fontFamily'] || DEFAULT_FONT,
        fontWeight: params['toast.text.fontWeight'] || '500',
        fontSize_px: params['toast.text.fontSize_pct']
          ? (params['toast.text.fontSize_pct'] / 100) *
            DEFAULT_TOAST_FONT_SIZE_PX
          : DEFAULT_TOAST_FONT_SIZE_PX,
      }}
    />
  );

  // custom overlay is the topmost of non-fullscreen graphics.
  // it's empty by default (meant to be overridden in session assets).
  graphics.push(<CustomOverlay key="customOverlay" />);

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
        key="titleSlate"
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
        key="openingSlate"
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
    <Slate key="closingSlate" id="closingSlate" show={inPostRoll} />
  );

  // debug printout overlay
  if (params['debug.showRoomState']) {
    const opacity = parseFloat(params['debug.overlayOpacity']) / 100;
    graphics.push(<RoomDebug key="roomDebug" bgOpacity={opacity} />);
  }

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
      <Box id="bgBox">{bgGraphics}</Box>
      <Box id="videoBox" layout={videoBoxLayout}>
        {video}
      </Box>
      <Box id="graphicsBox">{graphics}</Box>
    </Box>
  );
}

function parseCommaSeparatedList(str) {
  if (!str || str.length < 1) return [];

  return str.split(',').map((s) => s.trim());
}
