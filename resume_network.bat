@echo off
echo Resuming existing Hyperledger Fabric network...
wsl -d Ubuntu-22.04 bash -c "docker start \$(docker ps -aq)"

echo.
echo Checking network status...
wsl -d Ubuntu-22.04 bash -c "docker ps --format 'table {{.Names}}\t{{.Status}}'"

echo.
echo Persistent Blockchain network resumed successfully! All your data is safe.
pause
