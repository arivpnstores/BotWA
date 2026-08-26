apt update
apt remove -y nodejs npm
apt autoremove -y
apt install -y libvips-dev build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
node -v
npm -v
pm2 -v
npm i
pm2 start ecosystem.config.js
pm2 startup
pm2 save
pm2 ls
pm2 logs
