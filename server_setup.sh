#!/bin/bash
set -e

echo "Creating swap file..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
fi

echo "Installing Docker and Node.js..."
sudo apt-get update
sudo apt-get install -y docker.io docker-compose nodejs npm

echo "Adding user to docker group..."
sudo usermod -aG docker ubuntu

echo "Server setup complete. Please logout and log back in for docker group changes to take effect."
