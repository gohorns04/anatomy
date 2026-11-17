#!/bin/sh
# 원본(.cache/)에서 model/을 다시 만든다. README의 "모델 다시 만들기" 참고.
set -eu
cd "$(dirname "$0")/.."
mkdir -p model .cache/build/raw

# 1. Z-Anatomy 층 내보내기
blender -b .cache/zanatomy/Z-Anatomy/Startup.blend --python-exit-code 1 --python tools/export_layers.py
