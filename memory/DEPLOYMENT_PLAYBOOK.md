# Hostinger VPS + GitHub + Emergent Deploy Playbook (Fitsiomax OS)

> Source: User-provided playbook. Use this as the canonical reference for any deploy/CI-CD work on this app.

---

## Prerequisites
- Hostinger VPS (KVM 2+, Ubuntu 22.04 LTS)
- GitHub repo (created via Emergent "Save to GitHub")
- Domain/subdomain pointing to VPS IP (A record)

---

## PART 1 — One-Time VPS Setup

### Step 1: SSH into VPS
```bash
ssh root@<YOUR_VPS_IP>
```

### Step 2: System dependencies
```bash
apt update && apt upgrade -y
apt install -y git curl nginx python3-pip python3-venv build-essential
```

### Step 3: Node.js 20 + Yarn + PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn pm2
```

### Step 4: MongoDB 7
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update && apt install -y mongodb-org
systemctl enable mongod && systemctl start mongod
```

### Step 5: Clone repo
```bash
mkdir -p /var/www/<app-name>
cd /var/www/<app-name>
git clone https://<TOKEN>@github.com/<org>/<repo>.git app
```

### Step 6: Backend setup
```bash
cd /var/www/<app-name>/app/backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

`backend/.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=<your_app_db_name>
```

### Step 7: Frontend setup
```bash
cd /var/www/<app-name>/app/frontend
yarn install
```

`frontend/.env`:
```env
REACT_APP_BACKEND_URL=https://<your-domain.com>
```

```bash
yarn build
```

### Step 8: Backend via PM2
```bash
cd /var/www/<app-name>/app/backend
pm2 start "./venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001" --name backend
pm2 save
pm2 startup
```

### Step 9: Nginx reverse proxy
`/etc/nginx/sites-available/<app-name>`:
```nginx
server {
    listen 80;
    server_name <your-domain.com> www.<your-domain.com>;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 100M;
    }

    location / {
        root /var/www/<app-name>/app/frontend/build;
        try_files $uri /index.html;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/<app-name> /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Step 10: SSL with Let's Encrypt
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d <your-domain.com> -d www.<your-domain.com>
```

### Step 11: Firewall
```bash
ufw allow 80 && ufw allow 443 && ufw allow 22 && ufw enable
```

---

## PART 2 — VPS Deployment Info (to be filled by user)

```
## VPS Deployment Info
- VPS Host: <YOUR_VPS_IP>             # TODO: user to provide
- VPS User: root
- VPS Password: <YOUR_ROOT_PASSWORD>  # TODO: user to provide
- App Path: /var/www/<app-name>/app
- Domain: https://<your-domain.com>   # TODO: user to provide
- GitHub Repo: github.com/<org>/<repo> (branch: main)
- PM2 backend process: backend
- Frontend build dir: /var/www/<app-name>/app/frontend/build
- MongoDB: local mongod on 27017, db = <your_app_db_name>
- Backend venv: /var/www/<app-name>/app/backend/venv/bin/python
```

### Deploy command (single line)
```bash
sshpass -p '<ROOT_PWD>' ssh -o StrictHostKeyChecking=no root@<VPS_IP> "cd /var/www/<app-name>/app && git pull && cd frontend && yarn build && pm2 restart backend"
```

### DB seed runner
```bash
sshpass -p '<ROOT_PWD>' ssh root@<VPS_IP> "cd /var/www/<app-name>/app/backend && ./venv/bin/python scripts/<seed_file>.py"
```

---

## PART 3 — Day-to-Day Deploy Loop

| User action                         | Agent action                                              |
|-------------------------------------|-----------------------------------------------------------|
| Edits code via chat with E1         | Modify files in `/app`                                    |
| Clicks **Save to GitHub**           | Commits + pushes to `main`                                |
| Types **"deploy"**                  | Runs sshpass + git pull + yarn build + pm2 restart        |
| Requests DB seed                    | Runs `./venv/bin/python scripts/<file>.py` on VPS         |

Average deploy: 30–60s, zero downtime.

---

## PART 4 — Troubleshooting

| Symptom                                        | Fix                                                                |
|------------------------------------------------|--------------------------------------------------------------------|
| 502 Bad Gateway                                | `pm2 logs backend` → check traceback / missing env var             |
| `MongoServerError: ECONNREFUSED`               | `systemctl restart mongod`                                         |
| Frontend shows old version                     | Hard refresh; verify `yarn build` succeeded                        |
| `git pull` merge conflict                      | `git stash && git pull && git stash drop`                          |
| `sshpass: command not found` on Emergent pod   | `apt-get install -y sshpass`                                       |
| `pm2: command not found` on VPS                | `npm install -g pm2 && pm2 startup`                                |

---

## Security Quick Wins

1. **Enable MongoDB auth**
```bash
mongosh
> use admin
> db.createUser({user:"admin", pwd:"<STRONG_PWD>", roles:["root"]})
> exit
# /etc/mongod.conf → security: authorization: enabled
systemctl restart mongod
# Update MONGO_URL → mongodb://admin:<STRONG_PWD>@localhost:27017
```
2. **Disable root SSH password** (after key pair set up) — `PasswordAuthentication no`.
3. **Daily Mongo backup**
```bash
echo "0 3 * * * mongodump --db <db> --out /var/backups/mongo/\$(date +\%F)" | crontab -
```

---

## TL;DR Handoff Paragraph
> "My VPS is `<IP>`, root password `<PWD>`, app at `/var/www/<name>/app`, GitHub repo `<repo>`. Deploy with `sshpass -p '<PWD>' ssh root@<IP> \"cd /var/www/<name>/app && git pull && cd frontend && yarn build && pm2 restart backend\"`. MongoDB local on 27017. When I say 'deploy', run that. When I ask for a DB seed, use `./venv/bin/python scripts/<file>.py`."
