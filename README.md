# MouseKeysFX

Synthetic mouse-click and keyboard-typing sound simulator. Static page, Web Audio only, no build step.

Open `index.html` in a browser (or serve the folder with any static server). It loads `sound-library.js` next to it.

## Sound engine

Hits are rebuilt sample by sample from measured data, not from beeps or oscillator sweeps:

- `sound-library.js` holds loudness envelopes of real hits in 36 ERB-spaced frequency bands at 0.5 ms resolution
  (20 regular key presses, 8 big-key presses, 16 key releases), plus a mouse press and release with their measured
  ringing resonances (frequency, decay time, amplitude).
- At playback each hit is built by shaping band-limited noise with one of those envelopes, then bent by the sliders
  (decay speed, smoothness, tone, depth, sharpness) and randomized per hit.
- Stereo copies the two-microphone geometry of the reference recording (right channel about 45 us later), which
  reproduces its inter-channel correlation (0.17).
- Space and enter use the lowest, heaviest recorded presses, can be pitched down further and get stabilizer rattle.
- Typing timing follows the reference: press-to-release about 78 ms (std 17 ms), release about 10 dB quieter than the
  press, inter-key intervals roughly log-normal.

`tools/analysis/` contains the Python scripts that produced the library from the reference recordings
(`numpy` and `scipy` needed; paths at the top of each script point to the recordings).

## Features

- **Mouse**: presets (Recorded, Soft, Bright, Heavy), decay speed, smoothness, tone, body, sharpness, release click,
  hold time, humanize, click sequence / double click.
- **Keyboard**: presets (Recorded, Muted, Deep thock, Bright clicky, Light & fast); space and enter loudness, pitch
  and rattle; typing simulator with total duration, rhythm variation, burstiness and pauses after space / enter /
  punctuation.
- **Export**: WAV (16/24-bit PCM or 32-bit float, 44.1/48/96 kHz, stereo/mono, optional normalize), single-hit samples,
  and a CSV of event timestamps for syncing in a video editor.
