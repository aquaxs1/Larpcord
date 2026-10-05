# Larpcord sync server

Lets Larpcord users see each other's larp profiles. Larpcord uploads the shared part of your larp profile
here and loads the profiles of other Larpcord users from here. Nothing goes through Discord.

- **Login:** Discord OAuth2 with the read-only `identify` scope, in your browser. It only proves your user ID.
  Larpcord never sends your Discord token to this server, and the server revokes its own Discord token right
  after reading your ID.
- **Stored:** your user ID, your shared larp profile (badges, Nitro look, banner, colors, avatar, decoration,
  effect, nameplate, name style, clan tag, connections, display name, own activities) and a hash of your sync token.
  Turning sharing off deletes your profile immediately.
- **No dependencies:** Node 22.13+ only (`node:http`, `node:sqlite`).

## API

| Method | Path | |
|---|---|---|
| GET | `/v1/health` | `{ ok: true }` |
| GET | `/v1/auth/start?state=…` | Redirect to Discord login (`state`: 32–128 random URL-safe chars from the client) |
| GET | `/v1/auth/callback` | Discord redirect target |
| GET | `/v1/auth/poll?state=…` | `pending` → `done` (`token`, `userId`) or `error`, the token is handed out once |
| POST | `/v1/auth/logout` | Revokes the sync token |
| GET / PUT / DELETE | `/v1/profile` | Own profile (Bearer token). PUT body: shared profile JSON, max 256 KB |
| GET | `/v1/index` | `{ profiles: { userId: version } }` with ETag |
| GET | `/v1/profiles?ids=a,b` | Up to 50 profiles, `null` for unknown IDs |
| DELETE | `/v1/admin/profile/<id>` | Moderation, header `X-Admin-Key` |
| PUT / DELETE | `/v1/admin/ban/<id>?reason=…` | Ban (also deletes the profile) / unban |

Received profiles are untrusted: every Larpcord client validates them again before displaying anything.

## Running it on an Oracle Cloud server

These steps assume an Ubuntu VM in Oracle Cloud's free tier.

### 1. Free domain (DuckDNS)

1. Sign in on <https://www.duckdns.org>, create a subdomain (e.g. `larpcord`) and enter the **public IP** of
   your Oracle VM. You now have `larpcord.duckdns.org`.

### 2. Discord application

1. <https://discord.com/developers/applications> → **New Application** (e.g. "Larpcord Sync").
2. **OAuth2** → copy **Client ID** and **Client Secret** (reset it to see it).
3. **OAuth2 → Redirects** → add `https://larpcord.duckdns.org/v1/auth/callback`.

### 3. Open ports 80 and 443

1. Oracle Console → your instance → **Subnet** → **Security List** → add ingress rules for TCP **80** and **443**
   from `0.0.0.0/0`.
2. On the VM (Oracle's Ubuntu images block them with iptables by default):
   ```sh
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

### 4. Install and start

```sh
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
git clone https://github.com/aquaxs1/Larpcord.git
cd Larpcord/server
cp .env.example .env
nano .env                         # domain, PUBLIC_URL, client ID/secret, ADMIN_KEY (openssl rand -hex 32)
sudo chown -R 1000:1000 data      # the container runs as an unprivileged user
sudo docker compose up -d --build
```

Caddy gets a Let's Encrypt certificate automatically. Check it:

```sh
curl https://larpcord.duckdns.org/v1/health     # {"ok":true}
```

### 5. Point Larpcord at it

The server URL is set in Larpcord's hub → **Sync** (the default is built into the client:
`DEFAULT_SYNC_URL` in `desktop/src/main/larpSync.ts`).

### Updating, logs, backup

```sh
git pull && sudo docker compose up -d --build     # update
sudo docker compose logs -f sync                   # logs
cp data/larpcord-sync.db ~/backup-$(date +%F).db   # backup (one SQLite file)
```

### Moderation

```sh
# remove a profile
curl -X DELETE -H "X-Admin-Key: $ADMIN_KEY" https://larpcord.duckdns.org/v1/admin/profile/<userId>
# ban a user from sharing (also removes the profile)
curl -X PUT -H "X-Admin-Key: $ADMIN_KEY" "https://larpcord.duckdns.org/v1/admin/ban/<userId>?reason=abuse"
```

## Development

```sh
cd server
npm test                          # integration tests (Discord is mocked)
PORT=8080 npm start               # local server, login needs DISCORD_CLIENT_ID/SECRET
```
