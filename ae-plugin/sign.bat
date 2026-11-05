@echo off
rem Build and sign MouseKeysFX.zxp with Adobe's ZXPSignCmd (Windows).
rem   set ZXPSIGNCMD=C:\tools\ZXPSignCmd.exe
rem   set CERT_PASSWORD=secret
rem   sign.bat [path\to\certificate.p12]
setlocal
cd /d "%~dp0"
if "%ZXPSIGNCMD%"=="" set ZXPSIGNCMD=ZXPSignCmd.exe
if "%CERT_PASSWORD%"=="" ( echo Set CERT_PASSWORD to the certificate password & exit /b 1 )
set CERT=%~1
if "%CERT%"=="" set CERT=certs\mousekeysfx.p12

python build.py || exit /b 1
if not exist dist mkdir dist
if not exist certs mkdir certs
if not exist "%CERT%" (
  echo Creating self-signed certificate %CERT% ^(valid 20 years^)
  "%ZXPSIGNCMD%" -selfSignedCert PL Poland "Motionful Studio" "Motionful Studio" "%CERT_PASSWORD%" "%CERT%" -validityDays 7300 || exit /b 1
)
if exist dist\MouseKeysFX.zxp del dist\MouseKeysFX.zxp
"%ZXPSIGNCMD%" -sign build\com.motionful.mousekeysfx dist\MouseKeysFX.zxp "%CERT%" "%CERT_PASSWORD%" -tsa http://timestamp.digicert.com || exit /b 1
"%ZXPSIGNCMD%" -verify dist\MouseKeysFX.zxp -certinfo
echo Signed package: %CD%\dist\MouseKeysFX.zxp
