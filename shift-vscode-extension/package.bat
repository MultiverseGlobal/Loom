@echo off
echo Starting... > package_status.txt
npm run compile && npx -y @vscode/vsce package --skip-license --allow-missing-repository -o loom-dev-bridge-2.0.4.vsix
if %errorlevel% equ 0 (
    echo SUCCESS > package_status.txt
) else (
    echo FAILURE %errorlevel% > package_status.txt
)
dir loom-dev-bridge-2.0.4.vsix >> package_status.txt
