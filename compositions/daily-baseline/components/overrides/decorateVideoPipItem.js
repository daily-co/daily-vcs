/*
  This is an override point.

  You can replace this function to return a custom decorator component
  for video in the 'pip' layout mode.

  The default rendering for labels can also be toggled off here.

  Input arguments:
  * `index`: value is 0 for the main video, 1 for the PiP video.
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

export default function decorateVideoPipItem(index, participant, props) {
  return {
    enableDefaultLabels: true,
    customComponent: null,
    clipItem: false,
    customLayoutForVideo: null,
  };
}
