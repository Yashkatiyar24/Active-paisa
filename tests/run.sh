#!/usr/bin/env bash
# Runs the flow tests in headless Chrome and reports pass/fail.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8899}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || true)"
if [ -z "$CHROME" ] || [ ! -x "$CHROME" ]; then
  echo "Chrome not found. Set CHROME=/path/to/chrome" >&2
  exit 1
fi

python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1

run_suite () {
"$CHROME" --headless=new --disable-gpu --virtual-time-budget=60000 \
  --dump-dom "http://localhost:$PORT/tests/$1" 2>/dev/null \
| python3 -c '
import sys, re, html
d = sys.stdin.read()
for m in re.finditer(r"<li class=\"(pass|fail)\">(.*?)</li>", d, re.S):
    print(("  ok   " if m.group(1) == "pass" else "  FAIL ") + html.unescape(m.group(2)))
s = re.search(r"id=\"summary\"[^>]*>(.*?)</p>", d, re.S)
summary = html.unescape(s.group(1)).strip() if s else ""
m = re.match(r"(\d+) passed, (\d+) failed", summary)
if not m:
    print("\nno results — the suite did not finish")
    sys.exit(1)
print("\n" + summary)
sys.exit(1 if int(m.group(2)) else 0)
'
}

echo "── home page ─────────────────────────────────"
run_suite home.test.html
H=$?
echo
echo "── personal loan ─────────────────────────────"
run_suite flow.test.html
A=$?
echo
echo "── business loan ─────────────────────────────"
run_suite loan.test.html
B=$?
exit $(( H || A || B ))
