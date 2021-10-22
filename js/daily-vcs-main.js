import * as fs from 'fs';
import * as Path from 'path';
import * as React from 'react';

import { Composition, render } from './src';
import * as ViewComponents from './src/react-api/component';
import * as ViewContexts from './src/react-api/context';


// CLI arguments.
// 'comp' is a path to the JSX file to be loaded.
// 'data' is a path to a JSON file that will be watched for realtime updates.
const argmap = require('minimist')(process.argv.slice(2));
const srcCompPath = argmap['comp'];

if (!srcCompPath?.length) {
  console.error("Error: must provide --comp argument.");
  process.exit(1);
}

const ContentRoot = require(Path.resolve('.', srcCompPath)).default;


// a root component that wraps the view we loaded from the external JSX source,
// and provides the React Context interface for feeding external data from a JSON file.
class RootContainer extends React.Component {
  constructor() {
    super();

    this.state = {
      externalData: {},
      time: {
        currentTime: 0,
      }
    };
  }

  componentDidCatch(error, info) {
    console.error("\n** An error occurred in a React component:\n  %s\n", error.message, info.componentStack);
    console.error("\nExiting.");
    process.exit(4);
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

// the backing model for our views.
// the callback passed here will be called every time React has finished an update.
const composition = new Composition(function(comp) {
  //const json = comp.serialize();
  //console.log("update complete, view structure now: ", JSON.stringify(json, null, '  '));
});

// bind our React reconciler with the container component and the composition model.
// when the root container receives a state update, React will reconcile it into composition.
render(<RootContainer ref={rootContainerRef} />, composition);

let g_startT = Date.now() / 1000;

function updateVideoTime() {
  const t = Date.now() / 1000 - g_startT;
  rootContainerRef.current.setVideoTime(t);
}
setInterval(updateVideoTime, 1000);
