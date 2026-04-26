@echo off
echo Stopping old network (if any)...
wsl -d Ubuntu-22.04 bash -c "cd /home/zzz/fabric-samples/test-network && ./network.sh down"

echo.
echo Starting new Hyperledger Fabric network...
wsl -d Ubuntu-22.04 bash -c "cd /home/zzz/fabric-samples/test-network && ./network.sh up createChannel -c mychannel -ca"

echo.
echo Deploying ClearPath Chaincode...
wsl -d Ubuntu-22.04 bash -c "cd /home/zzz/fabric-samples/test-network && ./network.sh deployCC -ccn clearpath -ccp ../chaincode/clearpath -ccl javascript"

echo.
echo Blockchain network started successfully!
pause
