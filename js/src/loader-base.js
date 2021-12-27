import * as React from 'react';
import * as ViewContexts from '../src/react/contexts';

export function makeVCSRootContainer(ContentRoot, rootContainerRef) {
  // a root component that wraps the view we loaded from the external JSX source,
  // and provides the React Context interface for feeding external data from a JSON file.
  class RootContainer extends React.Component {
    constructor() {
      super();

      this.state = {
        compositionData: {
          mode: '',
          params: {},
        },
        time: {
          currentTime: 0,
        },
        mediaInput: {
          activeVideoInputSlots: [],
        },
      };
    }

    componentDidCatch(error, info) {
      console.error(
        '\n** An error occurred in a React component:\n  %s\n',
        error.message,
        info.componentStack
      );
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

    setParamValue(id, value) {
      const compositionData = { ...this.state.compositionData };
      compositionData.params = { ...compositionData.params };

      compositionData.params[id] = value;

      this.setState({ compositionData });
    }

    selectMode(modeId) {
      const compositionData = { ...this.state.compositionData };

      compositionData.mode = modeId;

      this.setState({ compositionData });
    }

    static getDerivedStateFromError(error) {
      return {hasError: true};
    }  

    render() {
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
