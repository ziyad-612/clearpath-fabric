#!/bin/bash
set -e

DOMAIN="clearpath.duckdns.org"

echo "Installing Nginx and Certbot..."
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx

echo "Switching Node application to port 3000..."
# Switch port in server.js from 80 to 3000
sed -i 's/const PORT = [0-9]*;/const PORT = 3000;/' /home/ubuntu/web/backend/server.js

# Restart node application on port 3000
sudo pm2 delete all || true
# Need sudo to bind to 80 before, but since it's 3000 now, they can still run as root or ubuntu.
# Keeping the same as fix_port.sh:
sudo pm2 start /home/ubuntu/web/backend/server.js --name clearpath-app

echo "Configuring Nginx..."
# Create an Nginx config
sudo tee /etc/nginx/sites-available/clearpath > /dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/clearpath /etc/nginx/sites-enabled/clearpath

sudo systemctl restart nginx

echo "Running Certbot to secure the domain..."
# This will obtain the certificate and modify the nginx conf to add SSL!
sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --register-unsafely-without-email

echo "HTTPS setup is complete!"
