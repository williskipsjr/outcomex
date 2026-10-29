"""A polite JSON getter: pauses between calls and retries dropped connections."""

import time

import requests

from . import config

# CLOB sits behind Cloudflare, which rejects the default python-requests
# user agent (error 1010). Say who we are, in a browser-like format.
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; outcomex-ml/0.1; student project)",
    "Accept": "application/json",
}

_session = requests.Session()
_session.headers.update(HEADERS)


class HttpError(Exception):
    def __init__(self, status, url, body=""):
        super().__init__(f"HTTP {status} for {url}: {body[:120]}")
        self.status = status


def get_json(url, params=None, retries=5, timeout=20):
    """GET url and return parsed JSON. Retries network errors, 429 and 5xx."""
    for attempt in range(1, retries + 1):
        time.sleep(config.REQUEST_PAUSE_SECONDS)
        try:
            response = _session.get(url, params=params, timeout=timeout)
        except requests.RequestException:
            if attempt == retries:
                raise
            time.sleep(1.5 * attempt)
            continue
        if response.status_code == 429 or response.status_code >= 500:
            if attempt == retries:
                raise HttpError(response.status_code, response.url, response.text)
            time.sleep(3 * attempt)
            continue
        if not response.ok:
            raise HttpError(response.status_code, response.url, response.text)
        return response.json()
    raise RuntimeError("unreachable")
