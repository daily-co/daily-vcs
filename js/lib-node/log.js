import * as util from 'util';

let g_logger;

function makeLogger(logFn) {
  g_logger = function logToHostInfo() {
    let s = util.format.apply(util, arguments);
    const date = new Date();
    s = date.toISOString() + ' | ' + s;
    logFn(s);
  }
}

export function logToHostInfo() {
  if (!g_logger) {
    makeLogger(console.log);
  }
  g_logger.apply(null, arguments);
}

export function setHostInfoFunc(logFn) {
  makeLogger(logFn);
}
