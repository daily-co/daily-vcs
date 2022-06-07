import * as React from 'react';
import * as ViewContexts from '../src/react/contexts/index.js';

export function makeVCSRootContainer(
  ContentRoot,
  rootContainerRef,
  displayOpts,
  paramValues,
  errorCb
) {
  const { viewportSize = { w: 1280, h: 720 }, pixelsPerGridUnit = 20 } =
    displayOpts;

  // a root component that wraps the view we loaded from the external JSX source,
  // and provides the React Context interface for feeding external data from a JSON file.
  class RootContainer extends React.Component {
    constructor() {
      super();

      // params need to be filtered for group paths ("groupName.paramName")
      const params = {};
      for (const key in paramValues) {
        this.applyParamValueToObj(params, key, paramValues[key]);
      }

      this.state = {
        hasError: false,
        compositionData: {
          params,
        },
        time: {
          currentTime: 0,
        },
        mediaInput: {
          viewportSize,
          pixelsPerGridUnit,
          activeVideoInputSlots: [],
        },
      };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true };
    }

    componentDidCatch(error, info) {
      console.error(
        '\n** An error occurred in a React component:\n  %s\n',
        error.message,
        info.componentStack
      );
      if (errorCb) {
        errorCb(error, info);
      }
    }

    setVideoTime(t, playbackState) {
      const newT = {
        ...this.state.time,
        currentTime: t,
        playbackState: playbackState || ViewContexts.PlaybackStateType.PLAYING,
      };
      this.setState({ time: newT });
    }

    setActiveVideoInputSlots(arr) {
      const newObj = {
        ...this.state.mediaInput,
        activeVideoInputSlots: arr,
      };
      this.setState({ mediaInput: newObj });
    }

    applyParamValueToObj(obj, id, value) {
      obj[id] = value;

      // if the param is of format "group.subid", make a convenience object for the group
      const idx = id.indexOf('.');
      if (idx > 0 && idx < id.length - 1) {
        const group = id.substr(0, idx);
        const subid = id.substr(idx + 1);
        if (typeof obj[group] !== 'object') {
          obj[group] = {};
        }
        obj[group][subid] = value;
      }
    }

    setParamValue(id, value) {
      const compositionData = { ...this.state.compositionData };
      compositionData.params = { ...compositionData.params };

      this.applyParamValueToObj(compositionData.params, id, value);

      this.setState({ compositionData });
    }

    render() {
      if (this.state.hasError) {
        return null;
      }

      // can't use JSX in VCS core because it needs to run on Node without transpiling

      return React.createElement(
        ViewContexts.CompositionDataContext.Provider,
        {
          value: this.state.compositionData,
        },
        React.createElement(
          ViewContexts.TimeContext.Provider,
          {
            value: this.state.time,
          },
          React.createElement(
            ViewContexts.MediaInputContext.Provider,
            {
              value: this.state.mediaInput,
            },
            React.createElement(
              'root',
              null,
              React.createElement(ContentRoot, null)
            )
          )
        )
      );
    }
  }

  return React.createElement(RootContainer, {
    ref: rootContainerRef,
  });
}
