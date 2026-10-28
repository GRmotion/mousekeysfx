# MouseKeysFX

Synthetic mouse-click and keyboard-typing sound simulator. Single static page, Web Audio only, no dependencies.

Open `index.html` in a browser (or serve the folder with any static server).

- **Sound engine**: every hit is synthesized sample by sample from damped resonant modes (shell, keycap, plate, switch leaf) plus filtered contact noise, tuned for real device sounds rather than interface beeps.
- **Mouse**: presets (Magic Mouse, MacBook trackpad, Microswitch, Quiet office, Gaming), snap speed, smoothness, tone, body, release click, hold time, humanize, click sequence / double click.
- **Keyboard**: presets (Magic Keyboard, MacBook Pro, MacBook butterfly, Linear thock, Tactile, Clicky blue), same sound controls plus depth, switch click and release sound; space and enter have their own loudness, pitch and stabilizer rattle; typing simulator with total duration, rhythm variation, burstiness and pauses after space / enter / punctuation.
- **Export**: WAV (16/24-bit PCM or 32-bit float, 44.1/48/96 kHz, stereo/mono, optional normalize), single-hit samples, and a CSV of event timestamps for syncing in a video editor.
