import * as React from 'react';
import { Composition, render } from '../src';
import * as ViewContexts from '../src/react/contexts';
import { renderCompInCanvas } from '../src/render/canvas';

// the example composition
import * as VCSComp from '../example/hello.jsx';


// a root component that wraps the view we loaded from the external JSX source,
// and provides the React Context interface for feeding external data from a JSON file.
class RootContainer extends React.Component {
  constructor() {
    super();

    this.state = {
      externalData: {
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

  setExternalData(data) {
    console.log("set data: ", data)
    this.setState({
      externalData: data || {}
    });
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
    const newExtData = {...this.state.externalData};
    newExtData.params = {...newExtData.params};

    newExtData.params[id] = value;

    this.setState({externalData: newExtData});
  }

  render() {
    const ContentRoot = VCSComp.default;

    return (
      <ViewContexts.ExternalDataContext.Provider value={this.state.externalData}>
      <ViewContexts.TimeContext.Provider value={this.state.time}>
      <ViewContexts.VideoCallContext.Provider value={this.state.videoCall}>
        <root>
          <ContentRoot />
        </root>
      </ViewContexts.VideoCallContext.Provider>
      </ViewContexts.TimeContext.Provider>
      </ViewContexts.ExternalDataContext.Provider>
    )
  }
}

// this will receive the instance of our root container component
const rootContainerRef = React.createRef();

let g_comp;
let g_canvas;
let g_imageSources = {};
let g_startT = 0;
let g_lastT = 0;

export function init(canvas, imageSources) {
  g_canvas = canvas;
  g_imageSources = imageSources || {};

  // the backing model for our views.
  // the callback passed here will be called every time React has finished an update.
  g_comp = new Composition(compUpdated);

  // bind our React reconciler with the container component and the composition model.
  // when the root container receives a state update, React will reconcile it into composition.
  render(<RootContainer ref={rootContainerRef} />, g_comp);

  g_startT = Date.now() / 1000;
  g_lastT = g_startT;

  console.log("starting");

  requestAnimationFrame(renderFrame);

  return new DailyVCSCommandAPI(VCSComp.compositionInterface);
}

function compUpdated(comp) {
  //const json = comp.serialize();
  //console.log("update complete, view structure now: ", JSON.stringify(json, null, '  '));

  //renderCompInCanvas(comp, g_canvas, g_imageSources);
}

function renderFrame() {
  const t = Date.now() / 1000;

  let renderNow = true;

  // limit frame rate to React updates
  if (t - g_lastT >= 1/4) {
    const videoT = t - g_startT;

    rootContainerRef.current.setVideoTime(videoT);

    g_lastT = t;
  }

  if (renderNow) {
    renderCompInCanvas(g_comp, g_canvas, g_imageSources);
  }

  requestAnimationFrame(renderFrame);
}


// --- command API ---

class DailyVCSCommandAPI {
  constructor(compInterface) {
    this.compositionInterface = compInterface;

    // set default values for params now
    for (const paramDesc of this.compositionInterface.params) {
      const {id, type, defaultValue} = paramDesc;
      if (!id || id.length < 1) continue;

      if (type === 'boolean' && defaultValue) {
        this.setParamValue(id, true);
      }
    }
  }

  getCompositionInterface() {
    return {...this.compositionInterface};
  }

  setActiveParticipants(arr) {
    if (!Array.isArray(arr)) {
      console.error("** setActiveParticipants: invalid object, expected array: " + typeof arr);
      return;
    }
    rootContainerRef.current.setActiveParticipants(arr);
  }

  setParamValue(id, value) {
    rootContainerRef.current.setParamValue(id, value);
  }
}
