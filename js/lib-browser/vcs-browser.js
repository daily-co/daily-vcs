import * as React from 'react';
import { Composition, render } from '../src';
import * as ViewContexts from '../src/react/contexts';
import RootView from '../example/hello.jsx';


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

export function init() {
  // the backing model for our views.
  // the callback passed here will be called every time React has finished an update.
  const composition = new Composition(function(comp) {
    const json = comp.serialize();
    console.log("update complete, view structure now: ", JSON.stringify(json, null, '  '));
  });

  // bind our React reconciler with the container component and the composition model.
  // when the root container receives a state update, React will reconcile it into composition.
  render(<RootContainer ref={rootContainerRef} />, composition);
}
