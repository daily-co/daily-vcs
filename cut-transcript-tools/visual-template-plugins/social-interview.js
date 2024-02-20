export async function createCutEventsInteractive(api, data) {
  const { print, question } = api;
  const { participants, transcript } = data;

  const numPeople = participants.orderedIds.length;

  const state = {
    participantDescs: [],
  };

  print(`There are ${numPeople} participants in this session.`);
  print(
    `Graphics will be created based on the information you provide here.\n`
  );

  for (let i = 0; i < numPeople; i++) {
    const id = participants.orderedIds[i];
    print(`Person ${i + 1}: ${participants.namesById[id]}`);

    const title = await question(`  Display name? `);
    const subtitle = await question(`  Subtitle (e.g. job description)? `);

    state.participantDescs.push({ id, title, subtitle });
  }

  const hasTranscript = Array.isArray(transcript?.paragraphs);

  print('');

  if (!hasTranscript) {
    print(
      "Skipping transcript-based graphics options because transcript isn't available for this session."
    );
  } else {
    let response;
    response = await question('Render transcript as captions? ');
    if (response.toLowerCase() === 'y') {
      state.renderCaptions = true;
    }

    response = await question('Render "snap zoom" effect on speaker change? ');
    if (response.toLowerCase() === 'y') {
      state.renderSnapZoom = true;
    }
  }

  return {
    ...(await createCutEventsFromSavedState(state, data)),
    state,
  };
}

export async function createCutEventsFromSavedState(state, data) {
  const { defaultEvents, transcript, transcriptTimelineId } = data;

  const { participantDescs } = state;
  const numPeople = participantDescs.length;

  // existing events represent video input changes.
  // there must be one at the start.
  if (defaultEvents.length < 1) return;

  const events = [...defaultEvents];

  // add video mode based on how many people are present
  events[0] = {
    ...events[0],
    params: {
      mode: numPeople > 2 ? 'grid' : 'split',
    },
  };

  let t = 1;

  const bannerPositions = ['top-left', 'bottom-right'];
  const bannerRotations = [-2.5, 3];
  const bannerMarginsX = [-0.5, -1];
  const bannerMarginsY = [0, 25];

  for (let i = 0; i < numPeople; i++) {
    const { title, subtitle } = participantDescs[i];

    const bannerPosition = bannerPositions[i % 2];
    const bannerRotation = bannerRotations[i % 2];
    const bannerMarginX = bannerMarginsX[i % 2];
    const bannerMarginY = bannerMarginsY[i % 2];

    events.push({
      t,
      params: {
        showBannerOverlay: true,
        'banner.position': bannerPosition,
        'banner.title': title,
        'banner.subtitle': subtitle,
        'banner.rotation_deg': bannerRotation,
        'banner.margin_x_gu': bannerMarginX,
        'banner.margin_y_gu': bannerMarginY,
        'banner.showIcon': false,
        'banner.text.fontFamily': 'Bitter',
      },
    });

    events.push({
      t: t + 4.5,
      params: {
        showBannerOverlay: false,
      },
    });

    t += 6.5;
  }

  if (transcript && (state.renderCaptions || state.renderSnapZoom)) {
    // find events that represent a cut within the given source timeline
    const timelineEvents = defaultEvents.filter(
      (ev) =>
        ev.clips && ev.sourceTimelineOffset?.timelineId === transcriptTimelineId
    );

    renderTranscriptInEvents(transcript, events, timelineEvents, state);
  }

  return { events };
}

function renderTranscriptInEvents(transcript, events, timelineEvents, opts) {
  const { renderCaptions, renderSnapZoom } = opts;

  // set up captions for transcripts
  if (renderCaptions) {
    events.push({
      t: 0,
      params: {
        'text.align_vertical': 'center',
        'text.align_horizontal': 'center',
        'text.fontSize_gu': 1.5,
        'text.color': 'rgba(255, 255, 255, 0.9)',
        'text.strokeColor': 'rgba(0, 0, 0, 0.6)',
        'text.fontWeight': '300',
        'text.offset_x_gu': 0.2,
        'text.offset_y_gu': 0.5,
        'text.stroke_gu': 0.4,
      },
    });
  }

  let lastCaptionEndT = -1;

  const speakerZoom = 1.18;
  let prevSpeaker = 0;
  let prevZoomTime = -1;

  for (const ev of timelineEvents) {
    const { sourceTimelineOffset, t: destT } = ev;
    const { start: startTInSource, end: endTInSource } = sourceTimelineOffset;

    for (const p of transcript.paragraphs) {
      const { sentences } = p;
      const speaker = parseInt(p.speaker, 10);

      let doSnapZoom = renderSnapZoom && speaker !== prevSpeaker;
      prevSpeaker = speaker;

      for (const s of sentences) {
        const { text, start, end } = s;
        if (start >= startTInSource && start < endTInSource) {
          const t = destT + (start - startTInSource);

          lastCaptionEndT = t + (end - start);

          const zoomFactors = [1, 1];
          let zoomApplied = false;
          if (doSnapZoom && speaker < zoomFactors.length) {
            doSnapZoom = false;
            // only apply the zoom if it's not too soon after the previous one
            if (t - prevZoomTime > 1) {
              zoomFactors[speaker] = speakerZoom;
              zoomApplied = true;
              prevZoomTime = t;
            }
          }

          let params = {};
          if (renderSnapZoom) {
            params = {
              ...params,
              'videoSettings.zoomFactorsList': zoomFactors.join(','),
            };
          }
          if (renderCaptions) {
            params = {
              ...params,
              showTextOverlay: true,
              'videoSettings.zoomFactorsList': zoomFactors.join(','),
              'text.content': text,
              'text.color':
                speaker === 0
                  ? 'rgba(255, 252, 220, 0.97)'
                  : 'rgba(150, 180, 255, 0.95)',
              'text.align_vertical': speaker === 1 ? 'bottom' : 'center',
            };
          }

          events.push({
            t,
            params,
          });

          if (zoomApplied) {
            // add an end zoom event for the "snap" look
            zoomFactors[speaker] = 1;
            events.push({
              t: t + 0.9,
              params: {
                'videoSettings.zoomFactorsList': zoomFactors.join(','),
              },
            });
          }
        }
      }
    }
  }

  if (lastCaptionEndT >= 0) {
    events.push({
      t: lastCaptionEndT,
      params: {
        showTextOverlay: false,
      },
    });
  }
}
