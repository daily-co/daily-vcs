// Polyfills for Node.js globals needed by react-pdf/fontkit/textkit
// in the browser. Used both by:
// - esbuild inject (for dependency pre-bundling)
// - inline <script> in the devrig HTML (for runtime globals)
import { Buffer } from 'buffer';
import process from 'process/browser';

globalThis.Buffer = Buffer;
globalThis.process = process;

export { Buffer, process };
