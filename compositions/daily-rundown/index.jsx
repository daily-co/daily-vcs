import * as React from 'react';
import { Box, Text, Video } from '#vcs-react/components';
import {
  useParams,
  useGrid,
  useViewportSize,
  useVideoPlaybackState,
  PlaybackStateType,
  useActiveVideo,
} from '#vcs-react/hooks';

import LogoSidebar from './components/LogoSidebar.js';
import RundownSidebar from './components/RundownSidebar.js';
import VideoContainer from './components/VideoContainer.js';
import { compositionParams, fontFamilies } from './params.js';
import { imagePreloads } from './preloads.js';
import * as layouts from './layouts.js';

//
// -- the control interface exposed by this composition --
export const compositionInterface = {
  displayMeta: {
    name: 'Daily Rundown',
    description: 'Renders a rundown sidebar with customizable logos',
  },
  imagePreloads,
  fontFamilies,
  params: compositionParams,
};

//
// -- the root component of this composition --
export default function DailyRundownVCS() {
  const params = useParams();
  const showLeftSidebar = !params['logoSidebar.hidden'];
  const showRightSidebar = !params['rundownSidebar.hidden'];

  const { activeIds } = useActiveVideo();

  // memoized values that are computed purely from 'params'
  const {
    baseTextStyle,
    rundownTextStyle,
    highlightStyle,
    participantLabelStyle,
    rundownLabels,
    makeTopLayout,
  } = React.useMemo(() => {
    const baseTextStyle = {
      fontFamily: params['textStyles.fontFamily'],
      fontWeight: params['textStyles.fontWeight'],
      fontSize_gu: 1.33 * (params['textStyles.baseFontSize_pct'] / 100),
    };
    const rundownTextStyle = {
      ...baseTextStyle,
      textAlign: 'center',
      textColor: params['colors.rundown.text'],
      strokeColor: 'rgba(0, 0, 0, 0.8)',
      strokeWidth_px: 5,
    };
    const highlightStyle = {
      ...rundownTextStyle,
      textColor: params['colors.rundown.highlight'],
      strokeColor: 'rgba(0, 0, 0, 0.9)',
      strokeWidth_px: 10,
    };
    const participantLabelStyle = {
      ...baseTextStyle,
      textColor: 'white',
      strokeColor: 'rgba(0, 0, 0, 0.5)',
      strokeWidth_px: 3,
    };

    let rundownLabels = parseCommaSeparatedList(params['rundown.items']).filter(
      (s) => s.length > 0
    );
    if (params['textStyles.rundown.uppercaseItems']) {
      rundownLabels = rundownLabels.map((s) => s.toUpperCase());
    }

    function makeTopLayout(index) {
      const splitPositions = [
        showLeftSidebar ? 0.2 : 0,
        showRightSidebar ? 0.8 : 1,
      ];
      return [layouts.rundownPortraitAdaptiveSplit, { index, splitPositions }];
    }

    return {
      baseTextStyle,
      rundownTextStyle,
      highlightStyle,
      participantLabelStyle,
      rundownLabels,
      makeTopLayout,
    };
  }, [params]);

  return (
    <Box>
      <Box
        layout={makeTopLayout(0)}
        style={{ fillColor: params['colors.logo.bg'] }}
      >
        {showLeftSidebar ? (
          <LogoSidebar
            logoAssetName={params['images.logo']}
            useTitle={!!params['logoSidebar.showTitleInsteadOfImage']}
            title={params['logoSidebar.title']}
            titleStyle={{
              ...baseTextStyle,
              fontWeight: params['logoSidebar.title.fontWeight'],
              fontSize_gu:
                baseTextStyle.fontSize_gu *
                (params['logoSidebar.title.fontSize_pct'] / 100),
            }}
            pollData={params.poll}
          />
        ) : null}
      </Box>
      <Box layout={makeTopLayout(1)}>
        <VideoContainer
          activeIds={activeIds}
          participantLabelStyle={participantLabelStyle}
          guestNameOverride={params['video.guestName']}
        />
      </Box>
      <Box
        layout={makeTopLayout(2)}
        style={{ fillColor: params['colors.rundown.bg'] }}
      >
        {showRightSidebar ? (
          <RundownSidebar
            itemLabels={rundownLabels}
            highlightIndex={params['rundown.position']}
            textStyle={rundownTextStyle}
            highlightStyle={highlightStyle}
            useTitle={!!params['rundownSidebar.showTitleInsteadOfImage']}
            title={params['rundownSidebar.title']}
            titleStyle={{
              ...baseTextStyle,
              fontWeight: params['rundownSidebar.title.fontWeight'],
              fontSize_gu:
                baseTextStyle.fontSize_gu *
                (params['rundownSidebar.title.fontSize_pct'] / 100),
            }}
          />
        ) : null}
      </Box>
    </Box>
  );
}

//
// -- utility function --
function parseCommaSeparatedList(str) {
  if (!str || str.length < 1) return [];

  return str.split(',').map((s) => s.trim());
}
