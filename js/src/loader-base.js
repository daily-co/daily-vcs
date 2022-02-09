import * as React from 'react';
import * as ViewContexts from '../src/react/contexts';

export function makeVCSRootContainer(
  ContentRoot,
  rootContainerRef,
  viewportSize,
  paramValues,
  errorCb
) {
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

    setVideoTime(t) {
      const newT = {
        ...this.state.time,
        currentTime: t,
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
      return (
        <ViewContexts.CompositionDataContext.Provider
          value={this.state.compositionData}
        >
          <ViewContexts.TimeContext.Provider value={this.state.time}>
            <ViewContexts.MediaInputContext.Provider
              value={this.state.mediaInput}
            >
              <root>
                <ContentRoot />
              </root>
            </ViewContexts.MediaInputContext.Provider>
          </ViewContexts.TimeContext.Provider>
        </ViewContexts.CompositionDataContext.Provider>
      );
    }
  }

  return <RootContainer ref={rootContainerRef} />;
}
