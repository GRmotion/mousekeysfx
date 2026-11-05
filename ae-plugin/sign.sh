#!/usr/bin/env bash
# Build and sign MouseKeysFX.zxp with Adobe's ZXPSignCmd (macOS / Linux wrapper; use sign.bat on Windows).
#
#   ZXPSIGNCMD=/path/to/ZXPSignCmd  CERT_PASSWORD='secret'  ./sign.sh [path/to/certificate.p12]
#
# Get ZXPSignCmd: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD
# Without a certificate argument a self-signed one (certs/mousekeysfx.p12) is created on first run.
set -euo pipefail
cd "$(dirname "$0")"
SIGN="${ZXPSIGNCMD:-ZXPSignCmd}"
: "${CERT_PASSWORD:?Set CERT_PASSWORD to the certificate password}"
CERT="${1:-certs/mousekeysfx.p12}"

python3 build.py
mkdir -p dist certs
if [ ! -f "$CERT" ]; then
  echo "Creating self-signed certificate $CERT (valid 20 years)"
  "$SIGN" -selfSignedCert PL Poland "Motionful Studio" "Motionful Studio" "$CERT_PASSWORD" "$CERT" -validityDays 7300
fi
rm -f dist/MouseKeysFX.zxp
# -tsa adds a trusted timestamp so the signature stays valid after the certificate expires
"$SIGN" -sign build/com.motionful.mousekeysfx dist/MouseKeysFX.zxp "$CERT" "$CERT_PASSWORD" -tsa http://timestamp.digicert.com
"$SIGN" -verify dist/MouseKeysFX.zxp -certinfo
echo "Signed package: $(pwd)/dist/MouseKeysFX.zxp"
