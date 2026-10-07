// A tiny Game Boy-style sound chip on Web Audio: two square waves, a triangle bass, and noise drums.
//
// Songs are text. Each track is a string of 16th-note steps separated by spaces:
//   C4 E4 G4 .   notes; '.' holds the previous note, '-' is a rest
//   k s h -      drums: kick, snare, hat, rest
// Multiple bars are joined with spaces, so a 4-bar track is 64 steps.

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

function freq(token) {
  const m = /^([A-G]#?)(\d)$/.exec(token);
  if (!m) return null;
  const midi = NOTE_INDEX[m[1]] + 12 * (Number(m[2]) + 1);
  return 440 * 2 ** ((midi - 69) / 12);
}

// Turn a step string into events: { step, len, freq } for notes, { step, drum } for drums.
function parse(track) {
  const steps = track.trim().split(/\s+/);
  const events = [];
  steps.forEach((tok, i) => {
    if (tok === '-') return;
    if (tok === '.') { const last = events[events.length - 1]; if (last && last.freq) last.len++; return; }
    if (track.isDrums || 'ksh'.includes(tok) && tok.length === 1) { events.push({ step: i, drum: tok }); return; }
    const f = freq(tok);
    if (f) events.push({ step: i, len: 1, freq: f });
  });
  return { events, length: steps.length };
}

export const SONGS = {
  home: {
    name: 'Home (calm)', bpm: 100, loop: true,
    tracks: [
      { wave: 'square', vol: 0.12, notes:
        'C5 . E5 . G5 . E5 . C5 . D5 . E5 . - . ' +
        'D5 . F5 . A5 . F5 . D5 . E5 . F5 . - . ' +
        'E5 . G5 . C6 . G5 . E5 . D5 . C5 . B4 . ' +
        'C5 . . . G4 . A4 . B4 . C5 . . . - .' },
      { wave: 'square', vol: 0.06, notes:
        'C4 - E4 - G4 - E4 - C4 - E4 - G4 - E4 - ' +
        'F4 - A4 - C5 - A4 - F4 - A4 - C5 - A4 - ' +
        'C4 - E4 - G4 - E4 - A3 - C4 - E4 - C4 - ' +
        'G3 - B3 - D4 - B3 - G3 - B3 - D4 - B3 -' },
      { wave: 'triangle', vol: 0.22, notes:
        'C3 . . . - . C3 . G2 . . . - . G2 . ' +
        'F2 . . . - . F2 . C3 . . . - . C3 . ' +
        'C3 . . . - . C3 . A2 . . . - . A2 . ' +
        'G2 . . . - . G2 . G2 . B2 . D3 . - .' },
      { wave: 'noise', vol: 0.5, notes:
        'k - h - s - h - k - h - s - h - h - '.repeat(4) },
    ],
  },
  wave: {
    name: 'Wave (tense)', bpm: 140, loop: true,
    tracks: [
      { wave: 'square', vol: 0.12, notes:
        'A4 . A4 . C5 . A4 . E5 . D5 . C5 . B4 . ' +
        'A4 . A4 . C5 . A4 . G5 . F5 . E5 . D5 . ' +
        'E5 . E5 . D5 . C5 . B4 . C5 . D5 . E5 . ' +
        'A5 . . . G5 . E5 . D5 . C5 . B4 . . .' },
      { wave: 'square', vol: 0.05, notes:
        'A3 - A3 - A3 - A3 - A3 - A3 - A3 - A3 - '.repeat(2) +
        'F3 - F3 - F3 - F3 - F3 - F3 - F3 - F3 - ' +
        'E3 - E3 - E3 - E3 - G3 - G3 - G3 - G3 -' },
      { wave: 'triangle', vol: 0.22, notes:
        'A2 . A2 . A2 . A2 . A2 . A2 . A2 . A2 . '.repeat(2) +
        'F2 . F2 . F2 . F2 . F2 . F2 . F2 . F2 . ' +
        'E2 . E2 . E2 . E2 . G2 . G2 . G2 . G2 .' },
      { wave: 'noise', vol: 0.5, notes:
        'k - h h s - h h k - h h s - h h '.repeat(4) },
    ],
  },
  victory: {
    name: 'Victory sting', bpm: 120, loop: false,
    tracks: [
      { wave: 'square', vol: 0.12, notes: 'C5 . E5 . G5 . C6 . . . . . - - - -' },
      { wave: 'square', vol: 0.07, notes: 'E4 . G4 . C5 . E5 . . . . . - - - -' },
      { wave: 'triangle', vol: 0.22, notes: 'C3 . . . G2 . . . C3 . . . . . - -' },
      { wave: 'noise', vol: 0.5, notes: 'k - - - k - - - s - - - - - - -' },
    ],
  },
  defeat: {
    name: 'Defeat sting', bpm: 90, loop: false,
    tracks: [
      { wave: 'square', vol: 0.12, notes: 'E5 . . . D#5 . . . D5 . . . C#5 . . . . . . . - - - -' },
      { wave: 'triangle', vol: 0.22, notes: 'A2 . . . . . . . G#2 . . . . . . . G2 . . . . . . .' },
      { wave: 'noise', vol: 0.5, notes: 'k - - - - - - - k - - - - - - - k - - - - - - -' },
    ],
  },
};

export function createPlayer() {
  let ctx = null, master = null, noiseBuf = null;
  let timer = null, song = null, parsed = null, startTime = 0, nextStep = 0, length = 0;
  let scheduled = 0;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function note(wave, f, vol, t, dur) {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.setValueAtTime(vol, Math.max(t + 0.004, t + dur - 0.03));
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.01);
    scheduled++;
  }

  function drum(kind, vol, t) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    let dur = 0.05;
    if (kind === 'k') { filt.type = 'lowpass'; filt.frequency.value = 180; dur = 0.12; }
    else if (kind === 's') { filt.type = 'bandpass'; filt.frequency.value = 1800; dur = 0.1; }
    else { filt.type = 'highpass'; filt.frequency.value = 7000; dur = 0.04; }
    g.gain.setValueAtTime(vol * (kind === 'h' ? 0.35 : 1), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.01);
    if (kind === 'k') { // a pitch drop under the kick gives it a thump
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      const og = ctx.createGain();
      og.gain.setValueAtTime(vol * 0.6, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(og).connect(master);
      osc.start(t);
      osc.stop(t + 0.13);
    }
    scheduled++;
  }

  // Schedule everything that falls in the next 120 ms.
  function tick() {
    const stepLen = 60 / song.bpm / 4;
    while (startTime + nextStep * stepLen < ctx.currentTime + 0.12) {
      const s = nextStep % length;
      const t = startTime + nextStep * stepLen;
      parsed.forEach((tr, i) => {
        const track = song.tracks[i];
        for (const ev of tr.events) {
          if (ev.step !== s) continue;
          if (ev.drum) drum(ev.drum, track.vol, t);
          else note(track.wave, ev.freq, track.vol, t, ev.len * stepLen);
        }
      });
      nextStep++;
      if (!song.loop && nextStep >= length) { stop(); return; }
    }
  }

  function play(s) {
    init();
    if (ctx.state === 'suspended') ctx.resume();
    stop();
    song = s;
    parsed = s.tracks.map((tr) => parse(Object.assign(tr.notes, { isDrums: tr.wave === 'noise' })));
    length = Math.max(...parsed.map((p) => p.length));
    startTime = ctx.currentTime + 0.05;
    nextStep = 0;
    timer = setInterval(tick, 25);
    tick();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    play, stop,
    get playing() { return !!timer; },
    get song() { return song; },
    get step() { return song && ctx ? Math.max(0, Math.floor((ctx.currentTime - startTime) / (60 / song.bpm / 4))) % length : 0; },
    get scheduled() { return scheduled; },
    set volume(v) { init(); master.gain.value = v; },
  };
}
