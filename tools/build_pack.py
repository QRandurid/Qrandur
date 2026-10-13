"""Rebuild the hinged GLB: python3 tools/build_pack.py.

Requires Python Playwright and Chromium. Loads pinned Three.js/GLTFExporter
through verified HTTPS and exports pack-model.js without changing source assets.
"""
import base64
import functools
import http.server
import shutil
import threading
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    cache = {}

    def verified_https(route):
        url = route.request.url
        if url not in cache:
            with urllib.request.urlopen(url, timeout=40) as response:
                headers = {key: value for key, value in response.headers.items()
                           if key.lower() not in ('content-length', 'content-encoding', 'transfer-encoding')}
                cache[url] = response.status, headers, response.read()
        status, headers, body = cache[url]
        route.fulfill(status=status, headers=headers, body=body)

    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as playwright:
            executable = shutil.which('chromium') or shutil.which('google-chrome')
            browser = playwright.chromium.launch(executable_path=executable, headless=True, args=['--no-sandbox'])
            try:
                page = browser.new_page()
                page.route('https://**/*', verified_https)
                page.route(origin + '/__export__', lambda route: route.fulfill(content_type='text/html', body='<!doctype html><title>Pack exporter</title>'))
                page.goto(origin + '/__export__')
                result = page.evaluate('''async () => {
                  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/+esm');
                  const {GLTFExporter} = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/exporters/GLTFExporter.js/+esm');
                  const {buildPackModel} = await import('./pack-model.js');
                  const model = await buildPackModel(THREE);
                  const data = await new GLTFExporter().parseAsync(model, {binary: true, animations: model.animations});
                  const bytes = new Uint8Array(data);
                  let output = '';
                  for (let i = 0; i < bytes.length; i += 8192) output += String.fromCharCode(...bytes.subarray(i, i + 8192));
                  return btoa(output);
                }''')
                data = base64.b64decode(result)
                if data[:4] != b'glTF':
                    raise ValueError('Exporter did not return a binary glTF model')
                destination = ROOT / 'QRandur_card_pack_3D.glb'
                destination.write_bytes(data)
                print(f'Generated {destination.name}: {len(data):,} bytes')
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
