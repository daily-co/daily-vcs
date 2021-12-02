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
        videoCall: {
          activeParticipants: []
        }
      };
    }

    componentDidCatch(error, info) {
      console.error("\n** An error occurred in a React component:\n  %s\n", error.message, info.componentStack);
    }

    setVideoTime(t) {
      const newT = {
        ...this.state.time,
        currentTime: t
      };
      this.setState({time: newT});
    }

    setActiveParticipants(arr) {
      const newVideoCall = {
        ...this.state.videoCall,
        activeParticipants: arr
      }
      this.setState({videoCall: newVideoCall});
    }

    setParamValue(id, value) {
      const compositionData = {...this.state.compositionData};
      compositionData.params = {...compositionData.params};

      compositionData.params[id] = value;

      this.setState({compositionData});
    }

    selectMode(modeId) {
      const compositionData = {...this.state.compositionData};

      compositionData.mode = modeId; 

      console.log("mode update: " + modeId);

      this.setState({compositionData});
    }

    render() {
      return (
        <ViewContexts.CompositionDataContext.Provider value={this.state.compositionData}>
        <ViewContexts.TimeContext.Provider value={this.state.time}>
        <ViewContexts.VideoCallContext.Provider value={this.state.videoCall}>
          <root>
            <ContentRoot />
          </root>
        </ViewContexts.VideoCallContext.Provider>
        </ViewContexts.TimeContext.Provider>
        </ViewContexts.CompositionDataContext.Provider>
      )
    }
  }

  return <RootContainer ref={rootContainerRef} />;
}