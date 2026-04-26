@echo off
echo Starting Backend...
start cmd /k "wsl -d Ubuntu-22.04 bash -c 'cd /home/zzz/fabric-samples/web/backend && npm install && node server.js'"

echo Starting Frontend...
start cmd /k "wsl -d Ubuntu-22.04 bash -c 'cd /home/zzz/fabric-samples/web/frontend && python3 -m http.server 8000'"

echo Servers started!
