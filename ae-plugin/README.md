# MouseKeysFX for After Effects

CEP panel (After Effects 2019 and newer). Pick a preset, press **Add to comp**:

- **Mouse**: preset, number of clicks. A layer with the clicks is added at the current time, above the selected layer
  if there is one. Layer markers show the exact moment of every click.
- **Keyboard**: preset, text, tempo (WPM). Same placement, one marker per keystroke (letter, Space, Enter).
- **Customize** (next to the preset) opens collapsible cards with every parameter.
- Sounds are rendered in the panel and saved as WAV files in an `sfx` folder next to the project file
  (the project has to be saved once). They are also imported into an `sfx` folder in the Project panel.
- The panel follows the After Effects theme (colors and font).

## Build and sign

```
python3 build.py                     # build/com.motionful.mousekeysfx + unsigned zip
CERT_PASSWORD=... ./sign.sh          # signed dist/MouseKeysFX.zxp (macOS/Linux)
sign.bat                             # same on Windows
```

`sign.sh` / `sign.bat` need Adobe's [ZXPSignCmd](https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD).
They create a self-signed certificate on first run, or use the `.p12` you pass in (never commit it; `certs/` is ignored).

Install the `.zxp` with a ZXP installer (for example aescripts ZXP Installer or Anastasiy's Extension Manager),
then open *Window > Extensions > MouseKeysFX*.

## Development

Copy `build/com.motionful.mousekeysfx` into the CEP extensions folder, with debug mode enabled for unsigned panels:

- macOS: `defaults write com.adobe.CSXS.9 PlayerDebugMode 1` (also `.10`, `.11`, `.12`), folder `~/Library/Application Support/Adobe/CEP/extensions`
- Windows: registry `HKEY_CURRENT_USER\Software\Adobe\CSXS.9` (also 10, 11, 12), `PlayerDebugMode` = `1` (string),
  folder `%APPDATA%\Adobe\CEP\extensions`

The sound engine (`engine.js`) and the recorded-sound library (`sound-library.js`) are shared with the web app and
copied in by `build.py`.
