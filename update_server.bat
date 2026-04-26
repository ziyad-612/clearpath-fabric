@echo off
set SERVER_IP=16.171.146.210
set PEM_FILE=aws.pem

echo [1/3] Compressing latest updates...
wsl -d Ubuntu-22.04 -u zzz -- bash -c "cd ~/fabric-samples && rm -f updates.tar.gz && tar --exclude='node_modules' --exclude='.git' -czvf updates.tar.gz web chaincode fix_port.sh"

echo [2/3] Uploading to AWS Server (%SERVER_IP%)...
wsl -d Ubuntu-22.04 -u zzz -- bash -c "cd ~/fabric-samples && scp -i %PEM_FILE% -o StrictHostKeyChecking=no updates.tar.gz ubuntu@%SERVER_IP%:/home/ubuntu/"

echo [3/3] Applying updates and restarting server...
wsl -d Ubuntu-22.04 -u zzz -- bash -c "ssh -i ~/fabric-samples/%PEM_FILE% -o StrictHostKeyChecking=no ubuntu@%SERVER_IP% 'tar -xzvf updates.tar.gz && sudo pm2 restart clearpath-app'"

echo.
echo ======================================================
echo  SUCCESS: Your live website has been updated!
echo  URL: http://%SERVER_IP%
echo ======================================================
pause
