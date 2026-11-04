# Deploying to Google Cloud e2-micro (free tier)

Full root access, always-on, £0 forever — as long as the VM stays in one of
the free-tier US regions. This site fits comfortably in 1GB RAM once built.

## 1. Create the VM

1. Go to <https://console.cloud.google.com> (free account, card needed for
   identity verification but never charged on free tier)
2. Create a project (e.g. `biotek`)
3. Compute Engine → VM Instances → **Create Instance**:
   - Name: `biotek`
   - Region: **us-west1** (or us-central1 / us-east1 — must be one of these
     for the free tier)
   - Zone: any in that region
   - Machine type: **e2-micro** (2 shared vCPU, 1GB RAM)
   - Boot disk: 30GB standard, **Ubuntu 24.04 LTS**
   - Firewall: tick **Allow HTTP traffic** and **Allow HTTPS traffic**
4. Create, then note the VM's **External IP**

## 2. Build locally (the 1GB VM is too small to compile)

On your own machine, in the project folder:

```bash
npm ci
npm run build
```

## 3. Get the code + files onto the VM

Easiest: push the repo to GitHub (private is fine), then clone on the VM.
Also copy `.env.local` and the `data/prod/` folder if you want to keep any
content you created locally:

```bash
# on the VM
sudo apt update && sudo apt install -y git curl
git clone https://github.com/YOURUSER/biotek-website.git && cd biotek-website

# copy .env.local + data/ up via scp from your machine:
#   scp .env.local user@VM_IP:~/biotek-website/
#   scp -r data user@VM_IP:~/biotek-website/
```

## 4. Install Node 20 (small footprint at runtime)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 5. Add swap (essential on 1GB RAM)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 6. Run the site with pm2 (auto-restart, boots on reboot)

```bash
sudo npm i -g pm2
cd ~/biotek-website
npm ci --omit=dev            # skip dev deps (sharp stays — it's needed? no: remove if unused at runtime)
pm2 start npm --name biotek -- run start
pm2 save
pm2 startup                   # follow the printed command to enable on boot
```

## 7. DNS

In one.com: DNS settings → add an **A record**:
- `@` → the VM's External IP
- `www` → same

(Or better: move nameservers to Cloudflare — free, faster DNS, and it gives
you origin-hiding + DDoS protection. Optional.)

## 8. HTTPS with Caddy (automatic certificates, zero config)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy.list
sudo apt update && sudo apt install caddy

sudo tee /etc/caddy/Caddyfile > /dev/null << 'CADDY'
biotekcrew.co.uk, www.biotekcrew.co.uk {
    reverse_proxy localhost:3000
}
CADDY

sudo systemctl reload caddy
```

Caddy fetches and renews Let's Encrypt certificates automatically once DNS
points at the VM.

## 9. Updating the site later

```bash
cd ~/biotek-website && git pull
npm ci && npm run build
pm2 restart biotek
```

## Notes

- Free tier = 1 e2-micro VM + 30GB disk + 1GB egress/month in the US
  regions. A crew site uses a fraction of that.
- `data/prod/` holds the live DB and uploaded photos — back it up now and
  then (`tar czf backup.tar.gz data/prod`), copy off-box with `scp`.
- Firewall: GCP firewall allows 80/443 from the instance settings in step 1.
  Nothing else needs opening (pm2 binds localhost behind Caddy).
