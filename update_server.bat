@echo off
:: Configuration
set SERVER_IP=16.171.146.210
set PEM_FILE=aws.pem

echo ======================================================
echo  🚀 CLEARPATH - STARTING UPDATE DEPLOYMENT
echo ======================================================

echo [1/3] Compressing latest updates in WSL...
wsl -d Ubuntu-22.04 -u zzz -- bash -c "cd ~/fabric-samples && rm -f updates.tar.gz && tar --exclude='node_modules' --exclude='.git' -czvf updates.tar.gz web chaincode"

echo [2/3] Uploading updates to AWS Server (%SERVER_IP%)...
wsl -d Ubuntu-22.04 -u zzz -- bash -c "cd ~/fabric-samples && scp -i %PEM_FILE% -o StrictHostKeyChecking=no updates.tar.gz ubuntu@%SERVER_IP%:/home/ubuntu/"

echo [3/3] Extracting and Restarting Application on AWS...
wsl -d Ubuntu-22.04 -u zzz -- bash -c "ssh -i ~/fabric-samples/%PEM_FILE% -o StrictHostKeyChecking=no ubuntu@%SERVER_IP% 'tar -xzvf updates.tar.gz && cd web/backend && npm install --production && sudo pm2 restart all || sudo pm2 restart clearpath-app'"

echo.
echo ======================================================
echo  ✅ SUCCESS: Live Website Updated!
echo  URL: http://%SERVER_IP%
echo ======================================================
pause
