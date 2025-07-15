import * as React from 'react';
import * as ViewContexts from './react/contexts/index.js';
import { makeEmptyStandardSources } from './react/contexts/CompositionDataContext.js';

export function makeVCSRootContainer(
  ContentRoot,
  rootContainerRef,
  displayOpts,
  paramValues,
  errorCb
) {
  const {
    viewportSize = { w: 1280, h: 720 },
    pixelsPerGridUnit = 20,
    renderingEnvironment = ViewContexts.RenderingEnvironmentType.UNKNOWN,
  } = displayOpts;

  // a root component that wraps the view we loaded from the external JSX source,
  // and provides the React Context interface for feeding external data from a JSON file.
  class RootContainer extends React.Component {
    constructor() {
      super();

      // params need to be filtered for group paths ("groupName.paramName")
      const params = {};
      for (const key in paramValues) {
        this.applyParamValueToObj(params, key, paramValues[key]);
      }

      this.state = {
        hasError: false,
        compositionData: {
          params,
          standardSources: makeEmptyStandardSources(),
        },
        time: {
          currentTime: 0,
        },
        mediaInput: {
          viewportSize,
          pixelsPerGridUnit,
          activeVideoInputSlots: [],
        },
        room: {
          renderingEnvironment,
          availablePeers: [],
        },
      };

      this.pendingState = null;

      // keys are message keys;
      // values are an object with sourceId + videoTime when message was received.
      // see note in addStandardSourceMessage() for details of how this is used.
      this.standardSourceMsgTimeAdded = new Map();

      // ensure we don't flood too many error messages
      this.errorMsgCount = 0;
      this.maxErrorMsgsToPrint = 100;

      // metadata for video inputs can be updated separately using updateVideoSlotFrameSize().
      // these updates must take priority over the base media input state because they are
      // directly from the rendering pipeline while base state can be from a higher-level system
      // that has cached the original values without knowledge of what the rendering pipeline sees.
      // map keys are video input ids.
      this.videoSlotFrameSizeOverrides = new Map();
    }

    logError(msg) {
      this.errorMsgCount++;
      if (this.errorMsgCount > this.maxErrorMsgsToPrint) return;

      if (this.errorMsgCount === this.maxErrorMsgsToPrint) {
        msg =
          '** Reached limit of error messages allowed from VCS RootContainer, no more will be printed from this instance after this.\n' +
          msg;
      }

      console.error(msg);
    }

    static getDerivedStateFromError(_error) {
      return { hasError: true };
    }

    componentDidCatch(error, info) {
      this.logError(
        `\n** An error occurred in a React component:\n  ${error.message}${info.componentStack}`
      );
      if (errorCb) {
        errorCb(error, info);
      }
    }

    setVideoTime(t, playbackState) {
      // this call can modify this.pendingState so it must come first
      this.pruneStandardSourcesAtTime(t);

      const newT = {
        ...this.state.time,
        currentTime: t,
        playbackState: playbackState || ViewContexts.PlaybackStateType.PLAYING,
      };

      let newState = this.pendingState || {};
      this.pendingState = null;

      newState.time = newT;

      this.setState(newState);
    }

    setActiveVideoInputSlots(arr) {
      if (!this.pendingState) this.pendingState = {};

      arr = this.applyOverridesToActiveVideoInputSlots(arr);

      const mediaInput = {
        ...(this.pendingState.mediaInput
          ? this.pendingState.mediaInput
          : this.state.mediaInput),
        activeVideoInputSlots: arr,
      };
      this.pendingState.mediaInput = mediaInput;
    }

    applyOverridesToActiveVideoInputSlots(activeVideoInputSlots) {
      if (this.videoSlotFrameSizeOverrides.size < 1)
        return activeVideoInputSlots;

      activeVideoInputSlots = [...activeVideoInputSlots];

      for (const [id, frameSize] of this.videoSlotFrameSizeOverrides) {
        const inp = activeVideoInputSlots.find((it) => it.id === id);
        if (!inp) {
          console.error(
            `Warning: updateVideoSlotFrameSize: no slot found with id ${id}`
          );
        } else {
          inp.frameSize = frameSize;
        }
      }

      return activeVideoInputSlots;
    }

    updateVideoSlotFrameSize(id, w, h) {
      if (!this.pendingState) this.pendingState = {};

      const mediaInput = {
        ...(this.pendingState.mediaInput
          ? this.pendingState.mediaInput
          : this.state.mediaInput),
      };

      this.videoSlotFrameSizeOverrides.set(id, { w, h });

      mediaInput.activeVideoInputSlots =
        this.applyOverridesToActiveVideoInputSlots(
          mediaInput.activeVideoInputSlots
        );

      this.pendingState.mediaInput = mediaInput;
    }

    setRoomPeerDescriptionsById(map) {
      // the internal context state is an array, so convert
      const arr = [];
      for (const [key, value] of map) {
        arr.push({
          ...value,
          id: key,
        });
      }
      this.setRoomPeerDescriptionsArray(arr);
    }

    setRoomPeerDescriptionsArray(arr) {
      if (!this.pendingState) this.pendingState = {};

      const room = {
        ...(this.pendingState.room ? this.pendingState.room : this.state.room),
        availablePeers: arr,
      };
      this.pendingState.room = room;
    }

    applyParamValueToObj(obj, id, value) {
      obj[id] = value;

      // if the param is of format "group.subid", make a convenience object for the group
      const idx = id.indexOf('.');
      if (idx > 0 && idx < id.length - 1) {
        const group = id.substr(0, idx);
        const subid = id.substr(idx + 1);
        if (typeof obj[group] !== 'object') {
          obj[group] = {};
        }
        obj[group][subid] = value;
      }
    }

    setParamValue(id, value) {
      if (!this.pendingState) this.pendingState = {};

      const compositionData = {
        ...(this.pendingState.compositionData
          ? this.pendingState.compositionData
          : this.state.compositionData),
      };
      compositionData.params = { ...compositionData.params };

      this.applyParamValueToObj(compositionData.params, id, value);

      this.pendingState.compositionData = compositionData;
    }

    setEnabledStandardSources(arr) {
      if (!this.pendingState) this.pendingState = {};

      const compositionData = {
        ...(this.pendingState.compositionData
          ? this.pendingState.compositionData
          : this.state.compositionData),
      };

      for (const key in compositionData.standardSources) {
        compositionData.standardSources[key].enabled = arr
          ? arr.includes(key)
          : false;
      }

      this.pendingState.compositionData = compositionData;
    }

    addStandardSourceMessage(id, data) {
      if (!data?.key) {
        this.logError(
          `** Standard source message must contain 'key' (source id ${id})`
        );
        return;
      }

      if (!this.pendingState) this.pendingState = {};

      const compositionData = {
        ...(this.pendingState.compositionData
          ? this.pendingState.compositionData
          : this.state.compositionData),
      };

      const srcObj = compositionData.standardSources[id];
      if (!srcObj) {
        this.logError(`** Unknown id '${id}' for addStandardSourceMessage`);
        return;
      }

      srcObj.latest = [...srcObj.latest, data];

      this.pendingState.compositionData = compositionData;

      // we need to track the ages of the messages in the 'latest' arrays for each standard source.
      // these arrays are small FIFO queues, and the consumers on the composition side are expected
      // to pick up changes within a reasonable time - which varies depending on the source type.
      // e.g. for emoji reactions, we don't keep them past a second because there's no point
      // in rendering emoji reactions that are older than that.
      this.standardSourceMsgTimeAdded.set(data.key, {
        sourceId: id,
        t: this.state.time.currentTime,
      });
    }

    pruneStandardSourcesAtTime(currentT) {
      let compositionData;

      for (const [msgKey, { sourceId, t }] of this.standardSourceMsgTimeAdded) {
        const age = currentT - t;

        // emoji reactions are very short-lived, so they should be kept in the queue
        // for only a second. we can keep other message types around for longer.
        // the expectation is that the rendering component on the composition side
        // will maintain its own state based on data it read from these 'latest' arrays.
        const isEmojiReaction = sourceId === 'emojiReactions';
        const maxAge = isEmojiReaction ? 1 : 60;

        if (age > maxAge) {
          if (!this.pendingState) {
            this.pendingState = {};
          }
          if (!compositionData) {
            compositionData = {
              ...(this.pendingState.compositionData
                ? this.pendingState.compositionData
                : this.state.compositionData),
            };
          }

          const srcObj = compositionData.standardSources[sourceId];
          if (!srcObj?.latest) {
            this.logError(
              `** Unknown id '${sourceId}' for addStandardSourceMessage`
            );
            continue;
          }

          // for the other arrays like 'chatMessages', we want to leave some of the latest messages
          // always available, so check if we're actually going to prune this
          const minCountToKeep = isEmojiReaction ? 0 : 20;

          if (srcObj.latest.length > minCountToKeep) {
            this.standardSourceMsgTimeAdded.delete(msgKey);

            const idx = srcObj.latest.findIndex((it) => it.key === msgKey);
            if (idx < 0) {
              this.logError(
                `** No item with key '${msgKey}' in standard source ${sourceId}`
              );
              continue;
            }
            srcObj.latest.splice(idx, 1);
          }
        }
      }
    }

    render() {
      if (this.state.hasError) {
        return null;
      }

      // can't use JSX in VCS core because it needs to run on Node without transpiling

      return React.createElement(
        ViewContexts.CompositionDataContext.Provider,
        {
          value: this.state.compositionData,
        },
        React.createElement(
          ViewContexts.TimeContext.Provider,
          {
            value: this.state.time,
          },
          React.createElement(
            ViewContexts.MediaInputContext.Provider,
            {
              value: this.state.mediaInput,
            },
            React.createElement(
              ViewContexts.RoomContext.Provider,
              {
                value: this.state.room,
              },
              React.createElement(
                'root',
                null,
                React.createElement(ContentRoot, null)
              )
            )
          )
        )
      );
    }
  }

  return React.createElement(RootContainer, {
    ref: rootContainerRef,
  });
}
