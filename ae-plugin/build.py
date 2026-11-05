#!/usr/bin/env python3
"""Assemble the CEP extension folder (and an unsigned zip) from the sources.

    python3 build.py            -> build/com.motionful.mousekeysfx/  +  build/MouseKeysFX-unsigned.zip
    sign.sh / sign.bat          -> signed MouseKeysFX.zxp (needs Adobe's ZXPSignCmd and a .p12 certificate)
"""
import os, shutil, zipfile, re
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
out = os.path.join(here, 'build'); ext = os.path.join(out, 'com.motionful.mousekeysfx')
shutil.rmtree(out, ignore_errors=True); os.makedirs(ext)
for d in ('CSXS', 'css', 'js', 'jsx'): shutil.copytree(os.path.join(here, d), os.path.join(ext, d))
shutil.copy(os.path.join(here, 'index.html'), ext)
# shared sound engine and recorded-sound library come from the web app
shutil.copy(os.path.join(root, 'engine.js'), os.path.join(ext, 'js', 'engine.js'))
shutil.copy(os.path.join(root, 'sound-library.js'), os.path.join(ext, 'js', 'sound-library.js'))
version = re.search(r'ExtensionBundleVersion="([^"]+)"', open(os.path.join(ext, 'CSXS', 'manifest.xml')).read()).group(1)
zpath = os.path.join(out, 'MouseKeysFX-unsigned.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(ext):
        for f in sorted(files):
            full = os.path.join(base, f); z.write(full, os.path.relpath(full, ext))
print('extension folder:', ext); print('unsigned zip    :', zpath, '(version %s)' % version)
