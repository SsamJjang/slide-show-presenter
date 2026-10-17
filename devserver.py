"""Test server for Apex Deck.

    python devserver.py              # http://localhost:5599, live reload on
    python devserver.py 8080         # another port
    python devserver.py --lan        # also reachable from your phone / the
                                     # presenting laptop on the same wifi
    python devserver.py --no-reload  # no auto-refresh (e.g. while presenting)

Three things the stock http.server doesn't do:

- NO CACHING. The default lets the browser cache js/css aggressively, so you
  edit a file, reload, and are silently served the old one. Every response
  here is no-store, so a reload always reflects what is on disk.

- LIVE RELOAD. Any change under the project (html, js, css) refreshes every
  open page — the editor, a presentation on another device, and the test page,
  which therefore re-runs the whole suite on every save. It works by injecting
  one small script into HTML responses; nothing in the project references it,
  so opening index.html straight from disk is unaffected.

- THE TEST PAGE. /test.html runs the deck's own checks in a sandbox (see the
  top of test.html). It never touches the deck you are editing.
"""
import functools
import http.server
import os
import socket
import sys
import threading
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
WATCH_EXT = (".html", ".js", ".css")

# Bumped by the watcher whenever a project file changes; each open page holds
# an event stream and reloads when it sees a new value.
version = 0
version_lock = threading.Condition()

RELOAD_JS = b"""(function () {
  var seen = null;
  function connect() {
    var es = new EventSource('/__events');
    es.onmessage = function (e) {
      if (seen !== null && e.data !== seen) location.reload();
      seen = e.data;
    };
    // Server restarted or the laptop slept: keep trying. The first message
    // after reconnecting carries the current version, so a change made while
    // disconnected still triggers a reload.
    es.onerror = function () { es.close(); setTimeout(connect, 1000); };
  }
  connect();
})();
"""


def snapshot():
    """mtime of every watched file, keyed by path."""
    out = {}
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d != "node_modules"]
        for f in files:
            if f.endswith(WATCH_EXT):
                p = os.path.join(base, f)
                try:
                    out[p] = os.stat(p).st_mtime
                except OSError:
                    pass
    return out


def watch():
    global version
    last = snapshot()
    while True:
        time.sleep(0.4)
        now = snapshot()
        if now != last:
            last = now
            with version_lock:
                version += 1
                version_lock.notify_all()


class Handler(http.server.SimpleHTTPRequestHandler):
    reload = True

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/__events" and self.reload:
            return self.events()
        if path == "/__livereload.js" and self.reload:
            return self.send_bytes(RELOAD_JS, "text/javascript")
        if self.reload and (path == "/" or path.endswith(".html")):
            return self.html(path)
        return super().do_GET()

    def send_bytes(self, body, ctype):
        self.send_response(200)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def html(self, path):
        file = os.path.normpath(os.path.join(ROOT, "index.html" if path == "/" else path.lstrip("/")))
        if not file.startswith(ROOT) or not os.path.isfile(file):
            return super().do_GET()
        with open(file, "rb") as fh:
            body = fh.read()
        tag = b'<script src="/__livereload.js"></script>'
        i = body.lower().rfind(b"</body>")
        body = body[:i] + tag + body[i:] if i >= 0 else body + tag
        self.send_bytes(body, "text/html")

    def events(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()
        sent = None
        try:
            while True:
                with version_lock:
                    if sent == version:
                        version_lock.wait(timeout=15)   # wakes on change, else heartbeats
                    current = version
                self.wfile.write(f"data: {current}\n\n".encode())
                self.wfile.flush()
                sent = current
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def log_message(self, fmt, *args):
        # Keep the console readable: errors only, not every asset request.
        code = str(args[1]) if len(args) > 1 else ""
        if code.startswith(("4", "5")):
            super().log_message(fmt, *args)


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))   # sends nothing; just picks the outgoing interface
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def main():
    args = sys.argv[1:]
    port = next((int(a) for a in args if a.isdigit()), 5599)
    lan = "--lan" in args
    Handler.reload = "--no-reload" not in args

    if Handler.reload:
        threading.Thread(target=watch, daemon=True).start()

    host = "0.0.0.0" if lan else "127.0.0.1"
    server = http.server.ThreadingHTTPServer((host, port), functools.partial(Handler, directory=ROOT))
    server.daemon_threads = True

    print(f"Apex Deck test server  ({'live reload' if Handler.reload else 'no reload'}, no cache)", flush=True)
    print(f"  editor   http://localhost:{port}/", flush=True)
    print(f"  tests    http://localhost:{port}/test.html", flush=True)
    if lan:
        ip = lan_ip()
        print(f"  on wifi  http://{ip}:{port}/" if ip else "  on wifi  (no network found)", flush=True)
    print("Ctrl+C to stop.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
