#!/bin/bash
set -e

echo "Switching port to 80 in server.js..."
sed -i 's/const PORT = [0-9]*;/const PORT = 80;/' /home/ubuntu/web/backend/server.js

echo "Disabling local UFW firewall..."
sudo ufw disable || true

echo "Restarting application with PM2 on port 80..."
sudo pm2 delete all || true
sudo pm2 start /home/ubuntu/web/backend/server.js --name clearpath-app

echo "Fix complete."
