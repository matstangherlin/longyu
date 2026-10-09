#!/usr/bin/env bash
# CI helper: install ffmpeg + ffprobe without apt crawl timeouts.
# BtbN "latest" occasionally returns HTTP 500 — try pinned autobuilds, then johnvansickle.
set -euo pipefail

if command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1; then
  ffmpeg -version | head -1
  exit 0
fi

TMP="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
ARCHIVE="$TMP/ffmpeg-static.tar.xz"
EXTRACT="$TMP/ffmpeg-extract"
mkdir -p "$EXTRACT"

download() {
  local url="$1"
  echo "Trying ffmpeg archive: $url"
  curl -fsSL --retry 3 --retry-delay 2 --retry-all-errors -o "$ARCHIVE" "$url"
}

install_from_archive() {
  rm -rf "$EXTRACT"
  mkdir -p "$EXTRACT"
  tar -xJf "$ARCHIVE" -C "$EXTRACT"
  local bin probe
  bin="$(find "$EXTRACT" -type f -path '*/bin/ffmpeg' -o -type f -name ffmpeg | head -1)"
  probe="$(find "$EXTRACT" -type f -path '*/bin/ffprobe' -o -type f -name ffprobe | head -1)"
  test -n "$bin" && test -n "$probe"
  if command -v sudo >/dev/null 2>&1; then
    sudo install -m 755 "$bin" /usr/local/bin/ffmpeg
    sudo install -m 755 "$probe" /usr/local/bin/ffprobe
  else
    install -m 755 "$bin" /usr/local/bin/ffmpeg
    install -m 755 "$probe" /usr/local/bin/ffprobe
  fi
}

URLS=(
  "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz"
  "https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-10-08-13-05/ffmpeg-N-127252-ga25ba44c0c-linux64-gpl.tar.xz"
  "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
)

ok=0
for url in "${URLS[@]}"; do
  if download "$url" && install_from_archive; then
    ok=1
    break
  fi
  echo "ffmpeg archive failed: $url" >&2
  rm -f "$ARCHIVE"
done

if [[ "$ok" -ne 1 ]]; then
  echo "Static archives failed; falling back to apt ffmpeg" >&2
  if command -v sudo >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends ffmpeg
  else
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends ffmpeg
  fi
fi

ffmpeg -version | head -1
ffprobe -version | head -1
