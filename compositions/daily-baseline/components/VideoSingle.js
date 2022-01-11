import * as React from 'react';
import { Box, Video } from '#vcs-react/components';
import { useActiveVideo } from '#vcs-react/hooks';

export default function VideoSingle({
  scaleMode,
  videoStyle,
  placeholderStyle,
}) {
  const { activeIds } = useActiveVideo();
  const activeId = activeIds.length > 0 ? activeIds[0] : null;

  if (activeId === null) {
    // if nobody is active, show a placeholder
    return <Box style={placeholderStyle} />;
  }

  return (
    <Video
      id="videosingle"
      src={activeId}
      style={videoStyle}
      scaleMode={scaleMode}
    />
  );
}
