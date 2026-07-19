"""Static dev server with caching disabled.

The default http.server lets the browser cache js/css aggressively, which
during development means you edit a file, reload, and are silently served the
old one. Every response here is marked no-store so a reload always reflects
what is on disk.
"""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Keep the console readable; only surface errors.
        if not args or not str(args[0]).startswith(("GET", "HEAD")):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5599
    root = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCacheHandler, directory=root)
    print(f"serving {root} on http://localhost:{port} (no-cache)")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
