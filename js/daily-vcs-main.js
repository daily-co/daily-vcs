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

const RootView = require(Path.resolve('.', srcCompPath)).default;
console.log("Loaded root view: ", RootView);


// a root component that wraps the view we loaded from the external JSX source,
// and provides the React Context interface for feeding external data from a JSON file.
class RootContainer extends React.Component {
  constructor() {
    super();

    this.state = {
      externalData: {}
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

  render() {
    return (
    <ViewContexts.ExternalDataContext.Provider value={this.state.externalData}>
      <root>
        <RootView />
      </root>
    </ViewContexts.ExternalDataContext.Provider>
    )
  }
}

// this will receive the instance of our root container component
const rootContainerRef = React.createRef();

/*
// read input data from the provided path and apply to the root container
function readInputJSON() {
  try {
    const json = fs.readFileSync(srcDataPath, {encoding: 'utf8'});
    const data = JSON.parse(json);

    rootContainerRef.current.setExternalData(data);
  } catch (e) {
    console.error("** Error reading input JSON: ", e);
  }
}

try {
  fs.watch(srcDataPath, function() {
    readInputJSON();
  });  

  console.log("Watching JSON input data from path: ", srcDataPath);
  console.log("You can edit that file while this program is running, and updates will be reflected here.\n");
} catch (e) {
  console.error("** Couldn't watch input JSON at: ", srcDataPath);
  process.exit(4);
}
*/

// the backing model for our views.
// the callback passed here will be called every time React has finished an update.
const composition = new Composition(function(comp) {
  const json = comp.serialize();
  console.log("update complete, view structure now: ", JSON.stringify(json, null, '  '));
});

// bind our React reconciler with the container component and the composition model.
// when the root container receives a state update, React will reconcile it into composition.
render(<RootContainer ref={rootContainerRef} />, composition);

// read once now
//readInputJSON();
