#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/app"
NODE_VERSION="20"

echo "=== UnQue Appointment API â€” EC2 Setup ==="

sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y git curl wget nginx ufw

curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v

sudo npm install -g pm2

mkdir -p "$APP_DIR/logs" "$APP_DIR/certs"
cd "$APP_DIR"

bash scripts/download-cert.sh

npm ci --omit=dev

sudo cp "$APP_DIR/scripts/nginx.conf" /etc/nginx/sites-available/unque
sudo ln -sf /etc/nginx/sites-available/unque /etc/nginx/sites-enabled/unque
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx && sudo systemctl enable nginx

sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 5001/tcp
sudo ufw --force enable

echo "=== Setup complete! ==="
echo "Next: cp .env.example .env && nano .env"
echo "Then: pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
