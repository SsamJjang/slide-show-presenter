"""Local server for APEX Ascents.

    python devserver.py          # http://localhost:5599
    python devserver.py --lan    # also reachable on your wifi (phone, other laptop)

Serves with caching off, so a reload always shows what is on disk.
"""
import functools
import http.server
import os
import socket
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".woff2": "font/woff2", ".js": "text/javascript"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if len(args) > 1 and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


def main():
    args = sys.argv[1:]
    port = next((int(a) for a in args if a.isdigit()), 5599)
    lan = "--lan" in args
    server = http.server.ThreadingHTTPServer(("0.0.0.0" if lan else "127.0.0.1", port),
                                             functools.partial(Handler, directory=ROOT))
    print(f"APEX Ascents  http://localhost:{port}/", flush=True)
    if lan:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("10.255.255.255", 1))
            print(f"  on wifi    http://{s.getsockname()[0]}:{port}/", flush=True)
        except OSError:
            pass
        finally:
            s.close()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
