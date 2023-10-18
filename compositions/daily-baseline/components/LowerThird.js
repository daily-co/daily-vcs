import * as React from 'react';
import { Box, Text, Image } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { useFade } from './useFade.js';

export default function LowerThird({
  title,
  subtitle,
  opacity = 1,
  enableFade = false,
  show = false,
  showIcon = true,
  iconOverrideAssetName,
  iconSize_gu = 3,
  renderAtMaxWidth = false,
  maxWidth_pct = {},
  positionCorner,
  pad_gu = 2,
  bgStyle = {},
  textStyle = {},
  titleStyle: titleStyle_prop = {},
  subtitleStyle: subtitleStyle_prop = {},
  marginX_gu = 0,
  marginY_gu = 1,
  rotate_deg = 0,
}) {
  opacity = useFade({ enableFade, show, opacity, fadeDuration: 0.35 });
  if (!opacity) return null;

  const titleStyle = {
    ...textStyle,
    ...titleStyle_prop,
  };
  const subtitleStyle = {
    ...textStyle,
    ...subtitleStyle_prop,
  };

  const bgTrs = {};
  if (rotate_deg !== 0) bgTrs.rotate_deg = rotate_deg;

  const iconSrc =
    iconOverrideAssetName && iconOverrideAssetName.length > 0
      ? iconOverrideAssetName
      : 'party-popper_1f389.png';

  const textPad = {
    l: showIcon ? iconSize_gu + 2 : 0,
    r: 0,
    t: 0,
    b: 0,
  };

  const layoutParams = {
    renderAtMaxWidth,
    maxWidth_pct,
    positionCorner,
    showIcon,
    iconSize_gu,
    marginX_gu,
    marginY_gu,
  };

  return (
    <Box
      style={bgStyle}
      transform={bgTrs}
      clip
      layout={[layoutFuncs.lowerThird, layoutParams]}
      blend={{ opacity }}
    >
      <Box layout={[layoutFuncs.pad, { pad_gu }]}>
        {showIcon ? (
          <Image
            src={iconSrc}
            layout={[layoutFuncs.toastIcon, { size_gu: iconSize_gu }]}
          />
        ) : null}

        <Box layout={[layoutFuncs.pad, { pad_gu: textPad }]}>
          <Box id="textStack" layout={[layoutFuncs.textStack]}>
            <Text key="title" style={titleStyle}>
              {title}
            </Text>
            {subtitle.length > 0 ? (
              <Text key="subtitle" style={subtitleStyle}>
                {subtitle}
              </Text>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
