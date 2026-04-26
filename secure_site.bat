@echo off
set SERVER_IP=16.171.146.210
set PEM_FILE=aws.pem

echo [1/2] Uploading HTTPS script to AWS Server...
wsl -d Ubuntu-22.04 -u zzz -- bash -c "cd ~/fabric-samples && scp -i %PEM_FILE% -o StrictHostKeyChecking=no enable_https.sh ubuntu@%SERVER_IP%:/home/ubuntu/"

echo [2/2] Running HTTPS configuration on server...
wsl -d Ubuntu-22.04 -u zzz -- bash -c "ssh -i ~/fabric-samples/%PEM_FILE% -o StrictHostKeyChecking=no ubuntu@%SERVER_IP% 'chmod +x enable_https.sh && ./enable_https.sh'"

echo.
echo ======================================================
echo  SUCCESS: HTTPS setup completed!
echo  URL: https://clearpath.duckdns.org
echo  NOTE: Ensure port 443 is open in your AWS security group!
echo ======================================================
pause
