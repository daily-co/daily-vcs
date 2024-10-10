import * as React from 'react';
import { logToHostInfo } from './log.js';
import { setTimeout } from 'timers/promises';

export class BatchState {
  constructor(fps, opts) {
    this.fps = fps || 30;
    this.videoTimeOffset = opts?.videoTimeOffset || 0;
    this.currentFrame = 0;
    this.initialStateApplied = false;

    // this will receive the instance of our root container component
    this.rootContainerRef = React.createRef();

    // optionally take a list of WebVtt cues to be processed
    if (Array.isArray(opts?.webVttCues) && opts.webVttCues.length > 0) {
      this.webVttCues = opts.webVttCues;
      this.cueCursor = -1;
      this.activeCue = null;
    }
  }

  getVideoTime() {
    return this.videoTimeOffset + this.currentFrame / this.fps;
  }

  applyNextWebVttCueIfNeeded() {
    // if we're at the end of the cue list, do nothing
    if (this.cueCursor >= this.webVttCues.length - 1) return;

    /*
    The data we use from the cue format:
    {
      startTime: 4.029,
      endTime: 7.464,
      text: 'Lorem ipsum',
    }
    */
    const t = this.getVideoTime();

    if (this.activeCue && t >= this.activeCue.endTime) {
      this.applyCueDataToComp(null, null);

      logToHostInfo(
        'closed cue %d at %f',
        this.cueCursor,
        this.activeCue.endTime
      );

      this.activeCue = null;
    }

    const nextCue = this.webVttCues[this.cueCursor + 1];

    if (t >= nextCue.startTime) {
      const cueData = extractNameFromCueText(nextCue.text);

      this.cueCursor++;

      this.applyCueDataToComp(cueData, this.cueCursor);

      this.activeCue = nextCue;

      logToHostInfo('applied cue %d at %f', this.cueCursor, nextCue.startTime);
    }
  }

  async renderFrameWithEventState(s) {
    if (s) this.applyStateToComp(s);

    if (this.webVttCues) {
      if (!this.initialStateApplied) {
        // apply a default state if we only have cues:
        // a single video input, showing transcript in captions and chat in toast
        this.applyStateToComp({
          activeVideoInputSlots: [true],
          params: {
            showTextOverlay: true,
            'text.source': 'transcript',
            'text.align_vertical': 'bottom',
            'toast.source': 'chatMessages',
            'toast.duration_secs': 3,
            'toast.showIcon': false,
          },
        });
      }
      this.applyNextWebVttCueIfNeeded();
    }

    this.rootContainerRef.current.setVideoTime(this.getVideoTime());

    // wait for a tick to allow any React async work to finish that might have been triggered by the above set
    await setTimeout(0);
  }

  applyStateToComp(s) {
    if (!s) return;

    this.initialStateApplied = true;

    const { activeVideoInputSlots, params } = s;

    if (Array.isArray(activeVideoInputSlots)) {
      this.rootContainerRef.current.setActiveVideoInputSlots(
        activeVideoInputSlots.slice()
      );
    }
    if (params) {
      for (const key in params) {
        this.rootContainerRef.current.setParamValue(key, params[key]);
      }
    }
  }

  applyCueDataToComp(cueData, key) {
    let name = '',
      text = '';
    if (cueData) {
      ({ name, text } = cueData);
    }

    this.initialStateApplied = true;

    // send a 'transcript' standard source message
    const data = {
      key,
      senderDisplayName: name,
      text,
    };
    this.rootContainerRef.current.addStandardSourceMessage('transcript', data);
  }
}

function extractNameFromCueText(text) {
  let name = null;
  if (text.indexOf('<v ') === 0) {
    let idx = text.indexOf('>');
    name = text.substring(3, idx);
    text = text.substring(idx + 1);
  }
  return { name, text };
}
