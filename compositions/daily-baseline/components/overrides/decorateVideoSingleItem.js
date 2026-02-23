/*
  This is an override point.

  You can replace this function to return a custom decorator component
  for video in the 'single' layout mode.

  The default rendering for labels can also be toggled off here.

  Input arguments:
  * `participant`: participant description object to be displayed.
                   May be null if there's no active video input.
  * `props`: props passed to the `VideoSingle` component.

  Return object props:
  * `enableDefaultLabels`: render the default participant labels.
  * `customComponent`: a custom VCS component to be rendered.
  * `clipItem`: if true, the custom component graphics are clipped inside
                the video item's frame.
  * `customLayoutForVideo`: a layout applied to the item's video element.

  If you return a custom component, it gets rendered last,
  on top of the default labels.
*/

import { MicStatusIndicator } from '../MicStatusIndicator.js';

export default function decorateVideoSingleItem(participant, props) {
  const audioPaused = participant?.audioPaused ?? false;

  return {
    enableDefaultLabels: true,
    customComponent: <MicStatusIndicator audioPaused={audioPaused} />,
    clipItem: false,
    customLayoutForVideo: null,
  };
}
