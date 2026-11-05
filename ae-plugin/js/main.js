/* MouseKeysFX panel for After Effects.
   Sound is rendered here (engine.js), written to <project folder>/sfx and placed in the comp by jsx/host.jsx. */
(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var SR = 48000;
var STORE = 'mousekeysfx.ae.v1';

/* ---------- state ---------- */
var state = { mode: 'mouse', mouse: JSON.parse(JSON.stringify(DEF.mouse)), kb: JSON.parse(JSON.stringify(DEF.kb)) };
state.mouse.repeat = 3;
state.kb.wpm = 60;
state.kb.text = 'Hello world, this is a typing test.';
try {
  var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (saved) { state.mode = saved.mode || state.mode; Object.assign(state.mouse, saved.mouse); Object.assign(state.kb, saved.kb); }
} catch (e) {}
function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }

/* ---------- customize cards ---------- */
function S(k, l, min, max, u) { return { k: k, l: l, min: min, max: max, u: u || '%' }; }
var CARDS = {
  mouse: [
    ['Sound', [S('speed', 'Decay speed', 0, 100), S('smooth', 'Smoothness', 0, 100), S('tone', 'Tone', 0, 100), S('body', 'Body', 0, 100),
      S('click', 'Sharpness', 0, 100), S('release', 'Release click', 0, 100), S('hold', 'Hold', 20, 250, ' ms'), S('human', 'Humanize', 0, 100)]],
    ['Sequence', [S('interval', 'Interval', 80, 2000, ' ms'), 'double', S('dblgap', 'Double gap', 60, 300, ' ms')]],
    ['Output', [S('vol', 'Volume', 0, 100), S('denoise', 'Noise reduction', 0, 100), S('room', 'Room', 0, 100), S('noise', 'Background noise', 0, 100)]]
  ],
  kb: [
    ['Sound', [S('speed', 'Decay speed', 0, 100), S('smooth', 'Smoothness', 0, 100), S('tone', 'Tone', 0, 100), S('depth', 'Depth', 0, 100),
      S('click', 'Sharpness', 0, 100), S('release', 'Release sound', 0, 100), S('human', 'Humanize', 0, 100)]],
    ['Big keys', [S('spaceBoost', 'Space level', -6, 12, ' dB'), S('spacePitch', 'Space pitch', -12, 4, ' st'),
      S('enterBoost', 'Enter level', -6, 12, ' dB'), S('enterPitch', 'Enter pitch', -12, 4, ' st'), S('rattle', 'Rattle', 0, 100)]],
    ['Rhythm', [S('rhythm', 'Variation', 0, 100), S('burst', 'Burstiness', 0, 100), S('pauseSpace', 'Pause: space', 0, 300),
      S('pauseEnter', 'Pause: enter', 0, 600), S('pausePunct', 'Pause: , . ! ?', 0, 300)]],
    ['Output', [S('vol', 'Volume', 0, 100), S('denoise', 'Noise reduction', 0, 100), S('room', 'Room', 0, 100),
      S('noise', 'Background noise', 0, 100), S('spread', 'Stereo spread', 0, 100)]]
  ]
};
var SOUND_KEYS = {
  mouse: ['speed', 'smooth', 'tone', 'body', 'click', 'release', 'hold', 'human'],
  kb: ['speed', 'smooth', 'tone', 'depth', 'click', 'release', 'human']
};

function buildCards(g) {
  var host = $(g + '-cards'), html = '';
  CARDS[g].forEach(function (card) {
    html += '<details class="card"><summary>' + card[0] + '</summary><div class="body">';
    card[1].forEach(function (d) {
      if (d === 'double') html += '<label class="chk"><input type="checkbox" data-g="' + g + '" data-k="double"> Double click</label>';
      else html += '<div class="srow"><span>' + d.l + '</span><input type="range" data-g="' + g + '" data-k="' + d.k + '" min="' + d.min +
        '" max="' + d.max + '" step="1"><output data-out="' + g + '.' + d.k + '" data-u="' + d.u + '"></output></div>';
    });
    html += '</div></details>';
  });
  host.innerHTML = html;
}

function presetSelect(g) {
  var sel = $(g + '-preset'), names = Object.keys(PRESETS[g]);
  sel.innerHTML = names.map(function (n) { return '<option>' + n + '</option>'; }).join('') + '<option>Custom</option>';
}

function sync() {
  ['mouse', 'kb'].forEach(function (g) {
    $(g + '-preset').value = state[g].preset;
    Array.prototype.forEach.call(document.querySelectorAll('#' + g + '-cards [data-k]'), function (el) {
      var v = state[g][el.dataset.k];
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    });
    Array.prototype.forEach.call(document.querySelectorAll('#' + g + '-cards output'), function (o) {
      var k = o.dataset.out.split('.')[1];
      o.textContent = state[g][k] + (o.dataset.u === '%' ? '' : '');
    });
  });
  $('mouse-repeat').value = state.mouse.repeat;
  $('kb-text').value = state.kb.text;
  $('kb-wpm').value = state.kb.wpm;
  updateInfo();
}

function typingSeconds() {
  var n = Array.from(state.kb.text.replace(/\r/g, '')).length;
  return n > 1 ? (n - 1) / (state.kb.wpm * 5 / 60) : 0;
}
function updateInfo() {
  var d = typingSeconds();
  $('kb-info').textContent = d ? 'WPM  ·  ' + d.toFixed(1) + ' s' : 'WPM';
}

function setMode(m) {
  state.mode = m;
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) { t.classList.toggle('on', t.dataset.mode === m); });
  $('mouse').hidden = m !== 'mouse';
  $('kb').hidden = m !== 'kb';
  $('add').textContent = 'Add to comp';
  status('');
  save();
}

/* ---------- host skin: follow the After Effects theme ---------- */
function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
function rgb(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
function applySkin() {
  var env = CS.hostEnv();
  if (!env || !env.appSkinInfo || !env.appSkinInfo.panelBackgroundColor) return;
  var c = env.appSkinInfo.panelBackgroundColor.color, bg = [Math.round(c.red), Math.round(c.green), Math.round(c.blue)];
  var dark = (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) < 128, W = [255, 255, 255], K = [0, 0, 0], r = document.documentElement.style;
  r.setProperty('--bg', rgb(bg));
  r.setProperty('--field', rgb(mix(bg, dark ? K : W, dark ? 0.25 : 0.6)));
  r.setProperty('--btn', rgb(mix(bg, dark ? W : K, dark ? 0.1 : 0.07)));
  r.setProperty('--btn-hover', rgb(mix(bg, dark ? W : K, dark ? 0.16 : 0.13)));
  r.setProperty('--line', rgb(mix(bg, dark ? W : K, dark ? 0.2 : 0.28)));
  r.setProperty('--line-soft', rgb(mix(bg, dark ? K : K, dark ? 0.2 : 0.1)));
  r.setProperty('--text', dark ? '#d2d2d2' : '#1a1a1a');
  r.setProperty('--muted', dark ? '#8e8e8e' : '#686868');
  if (env.appSkinInfo.baseFontFamily) r.setProperty('--font', '"' + env.appSkinInfo.baseFontFamily + '", "Segoe UI", -apple-system, Arial, sans-serif');
  if (env.appSkinInfo.baseFontSize) r.setProperty('--size', Math.max(10, Math.min(14, env.appSkinInfo.baseFontSize)) + 'px');
}

/* ---------- status ---------- */
function status(msg, cls) { var s = $('status'); s.textContent = msg || ''; s.className = cls || ''; }

/* ---------- add to comp ---------- */
function evalHost(script) { return new Promise(function (res) { CS.evalScript(script, res); }); }
function blobBytes(blob) {
  return new Promise(function (res, rej) {
    var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsArrayBuffer(blob);
  });
}
function bytesToBase64(buf) {
  var bin = '', a = new Uint8Array(buf), step = 0x8000;
  for (var i = 0; i < a.length; i += step) bin += String.fromCharCode.apply(null, a.subarray(i, i + step));
  return btoa(bin);
}
function writeFile(dir, name, buf) {
  var path = dir.replace(/[\\\/]+$/, '') + (dir.indexOf('\\') >= 0 ? '\\' : '/') + name;
  try {
    var fs = (typeof require === 'function') ? require('fs') : null;
    if (fs) { fs.writeFileSync(path, Buffer.from(buf)); return Promise.resolve(path); }
  } catch (e) {}
  if (window.cep && window.cep.fs) {
    var r = window.cep.fs.writeFile(path.replace(/\\/g, '/'), bytesToBase64(buf), window.cep.encoding.Base64);
    if (r && r.err === 0) return Promise.resolve(path);
    return Promise.reject(new Error('Could not write ' + name + ' (error ' + (r && r.err) + ').'));
  }
  return Promise.reject(new Error('No file access in this panel.'));
}
function ascii(json) { return json.replace(/[\u0080-￿]/g, function (c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); }); }

function markerLabel(e, mode, i) {
  if (mode === 'mouse') return 'Click ' + (i + 1);
  return e.kind === 'space' ? 'Space' : e.kind === 'enter' ? 'Enter' : e.c;
}

var busy = false;
async function add() {
  if (busy) return;
  var g = state.mode, kind = g === 'mouse' ? 'click' : 'typing';
  busy = true; $('add').disabled = true; status('Checking the scene…');
  try {
    var prep = (await evalHost('MKFX.prepare("' + kind + '")')).split('|');
    if (prep[0] !== 'ok') throw new Error(prep.slice(1).join('|') || 'After Effects did not answer.');
    var dir = prep[1], name = prep[2];

    status('Rendering…');
    await new Promise(function (r) { setTimeout(r, 30); });
    var p = Object.assign({}, state[g]);
    p.seed = Math.floor(Math.random() * 100000);
    if (g === 'kb') {
      if (!p.text.replace(/\s/g, '').length) throw new Error('Type some text first.');
      p.duration = Math.max(0.2, typingSeconds());
    }
    var evs = g === 'mouse' ? mouseEvents(p) : typingEvents(p);
    var out = await renderEvents(g, p, evs, SR);
    var buf = await blobBytes(encodeWAV(out.buffer, '16', false, false));

    status('Writing sfx/' + name + '…');
    var path = await writeFile(dir, name, buf);

    var first = evs[0].t;
    var payload = {
      path: path,
      first: first,
      layerName: g === 'mouse' ? 'Mouse clicks' : 'Typing: ' + state.kb.text.replace(/\s+/g, ' ').slice(0, 24),
      markers: evs.map(function (e, i) { return { t: e.t, label: markerLabel(e, g, i) }; })
    };
    var res = (await evalHost('MKFX.add(' + JSON.stringify(ascii(JSON.stringify(payload))) + ')')).split('|');
    if (res[0] !== 'ok') throw new Error(res.slice(1).join('|') || 'After Effects did not answer.');
    status('Added sfx/' + res[1], 'ok');
  } catch (e) {
    status(e.message || String(e), 'err');
  } finally {
    busy = false; $('add').disabled = false;
  }
}

/* ---------- events ---------- */
document.addEventListener('input', function (e) {
  var el = e.target, g = el.dataset && el.dataset.g, k = el.dataset && el.dataset.k;
  if (g && k) {
    state[g][k] = el.type === 'checkbox' ? el.checked : +el.value;
    if (SOUND_KEYS[g].indexOf(k) >= 0) state[g].preset = 'Custom';
    sync(); save(); return;
  }
  if (el.id === 'mouse-repeat') state.mouse.repeat = Math.max(1, Math.min(50, Math.round(+el.value) || 1));
  else if (el.id === 'kb-text') state.kb.text = el.value;
  else if (el.id === 'kb-wpm') state.kb.wpm = Math.max(10, Math.min(300, Math.round(+el.value) || 60));
  else return;
  updateInfo(); save();
});
document.addEventListener('change', function (e) {
  var el = e.target;
  if (el.id === 'mouse-repeat' || el.id === 'kb-wpm') sync();
  ['mouse', 'kb'].forEach(function (g) {
    if (el.id === g + '-preset' && PRESETS[g][el.value]) { Object.assign(state[g], PRESETS[g][el.value]); state[g].preset = el.value; sync(); save(); }
  });
});
document.addEventListener('click', function (e) {
  var t = e.target;
  if (t.classList.contains('tab')) setMode(t.dataset.mode);
  else if (t.id === 'mouse-custom' || t.id === 'kb-custom') {
    var cards = $(t.id.replace('custom', 'cards')), open = cards.hidden;
    cards.hidden = !open; t.setAttribute('aria-expanded', String(open));
  } else if (t.id === 'add') add();
});

/* ---------- init ---------- */
['mouse', 'kb'].forEach(function (g) { presetSelect(g); buildCards(g); });
sync(); setMode(state.mode); applySkin(); CS.onThemeChange(applySkin);
})();
