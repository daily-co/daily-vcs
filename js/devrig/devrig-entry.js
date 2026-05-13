// Devrig entry point for Vite.
// Polyfills must be set up before importing the VCS library,
// since fontkit/textkit depend on Buffer and process globals.
import './browser-polyfills.js';

// Import the VCS browser library and expose it on window
// so the inline script in vcs-rig.html can access it.
import * as VCSBrowser from '../lib-browser/vcs-browser.js';

window['__VCS_DEVRIG_LIB__'] = VCSBrowser;
