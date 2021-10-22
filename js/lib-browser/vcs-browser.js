import * as React from 'react';
import { Composition, render } from '../src';
import * as ViewContexts from '../src/react/contexts';
import { renderCompInCanvas } from '../src/render/canvas';

// the example composition
import ContentRoot from '../example/hello.jsx';


// a root component that wraps the view we loaded from the external JSX source,
// and provides the React Context interface for feeding external data from a JSON file.
class RootContainer extends React.Component {
  constructor() {
    super();

    this.state = {
      externalData: {},
      time: {
        currentTime: 0,
      },
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

  render() {
    return (
      <ViewContexts.ExternalDataContext.Provider value={this.state.externalData}>
      <ViewContexts.TimeContext.Provider value={this.state.time}>
        <root>
          <ContentRoot />
        </root>
      </ViewContexts.TimeContext.Provider>
      </ViewContexts.ExternalDataContext.Provider>
    )
  }
}

// this will receive the instance of our root container component
const rootContainerRef = React.createRef();

let g_comp;
let g_canvas;
let g_assets = {};
let g_startT = 0;
let g_lastT = 0;

export function init(canvas, assets) {
  g_canvas = canvas;
  g_assets = assets;

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
}

function compUpdated(comp) {
  //const json = comp.serialize();
  //console.log("update complete, view structure now: ", JSON.stringify(json, null, '  '));

  renderCompInCanvas(comp, g_canvas);
}

function renderFrame() {
  const t = Date.now() / 1000;

  // limit frame rate
  if (t - g_lastT >= 1/4) {
    const videoT = t - g_startT;

    rootContainerRef.current.setVideoTime(videoT);

    g_lastT = t;
  }

  requestAnimationFrame(renderFrame);
}
