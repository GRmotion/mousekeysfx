# MouseKeysFX

Synthetic mouse-click and keyboard-typing sound simulator. Single static page, Web Audio only, no dependencies.

Open `index.html` in a browser (or serve the folder with any static server).

- **Mouse**: click types (presets), snap speed, smoothness, tone, body, release click, hold time, humanize, click sequence / double click.
- **Keyboard**: switch types, same sound controls plus depth, switch click and release sound; space and enter have their own loudness, pitch and stabilizer rattle; typing simulator with total duration, rhythm variation, burstiness and pauses after space / enter / punctuation.
- **Export**: WAV (16/24-bit PCM or 32-bit float, 44.1/48/96 kHz, stereo/mono, optional normalize), single-hit samples, and a CSV of event timestamps for syncing in a video editor.
