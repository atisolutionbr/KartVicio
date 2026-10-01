#!/usr/bin/env bash
set -euo pipefail
cd /opt/kart-vicio
test -s .env.production
# Nunca modifica volumes ou menus do United.
docker compose -p kart-vicio -f docker-compose.production.yml build
docker compose -p kart-vicio -f docker-compose.production.yml up -d
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:15300/kart/api/health >/dev/null; then break; fi
  sleep 2
done
curl -fsS http://127.0.0.1:15300/kart/api/health >/dev/null
config=$(readlink -f /etc/nginx/sites-enabled/united.atisolution.com.br)
test -f "$config"
backup="${config}.kart-backup-$(date +%Y%m%d%H%M%S)"
cp -p "$config" "$backup"
mkdir -p /etc/nginx/snippets
cp infra/nginx/kart.locations.conf /etc/nginx/snippets/kart-vicio.conf
python3 - "$config" <<'PY'
import pathlib,sys
path=pathlib.Path(sys.argv[1]); text=path.read_text()
include='    include /etc/nginx/snippets/kart-vicio.conf;'
if include not in text:
    marker='server_name united.atisolution.com.br;'
    if marker not in text: raise SystemExit('Bloco United não encontrado; nenhuma alteração aplicada')
    text=text.replace(marker,marker+'\n'+include,1)
    path.write_text(text)
PY
if ! nginx -t; then
  cp -p "$backup" "$config"
  nginx -t
  echo 'Configuração restaurada; publicação do caminho interrompida' >&2
  exit 1
fi
systemctl reload nginx
curl -fsS https://united.atisolution.com.br/kart/api/health
printf '\nKartVicio publicado; backup Nginx: %s\n' "$backup"
