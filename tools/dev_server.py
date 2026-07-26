"""Serveur de dev local pour Arcane Rift.

Sert les fichiers statiques du jeu exactement comme `python -m http.server`,
et expose en plus une petite route d'API pour que `src/eventlog.js` puisse
écrire le journal de combat directement dans `logs/` sans passer par la
boîte de dialogue "Sélectionnez où enregistrer" du navigateur (File System
Access API) : le client fait un simple POST, ce script écrit le fichier.

N'existe que pour l'usage local : le site déployé sur GitHub Pages n'a pas
cette route (hébergement statique) et `eventlog.js` retombe alors
automatiquement sur le téléchargement classique.

Lancer depuis la racine du projet :  python tools/dev_server.py [port]
Puis ouvrir http://localhost:8123 (port par défaut).
"""
import http.server
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_DIR = os.path.join(ROOT, 'logs')
LABEL_RE = re.compile(r'^[A-Za-z0-9_-]{1,64}$')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        if self.path.startswith('/api/log'):
            return  # évite une ligne de console par entrée de log
        super().log_message(fmt, *args)

    def end_headers(self):
        # Pas de cache en dev : évite de servir un vieux src/*.js après édition.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if self.path == '/api/log/ping':
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def do_POST(self):
        if self.path != '/api/log':
            self.send_response(404)
            self.end_headers()
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length) or b'{}')
            label = body.get('label', '')
            lines = body.get('lines', [])
            if not LABEL_RE.match(label) or not isinstance(lines, list):
                raise ValueError('payload invalide')
            os.makedirs(LOG_DIR, exist_ok=True)
            path = os.path.join(LOG_DIR, f'combat-log-{label}.jsonl')
            with open(path, 'a', encoding='utf-8') as f:
                for line in lines:
                    f.write(json.dumps(line, ensure_ascii=False) + '\n')
            self.send_response(204)
            self.end_headers()
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    server = http.server.ThreadingHTTPServer(('0.0.0.0', port), Handler)
    print(f'Arcane Rift — http://localhost:{port}  (journal de combat -> logs/)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
