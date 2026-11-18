#!/bin/sh
# 원본(.cache/)에서 model/을 다시 만든다. README의 "모델 다시 만들기" 참고.
set -eu
cd "$(dirname "$0")/.."
mkdir -p model .cache/build/raw

# 1. Z-Anatomy 층 내보내기
blender -b .cache/zanatomy/Z-Anatomy/Startup.blend --python-exit-code 1 --python tools/export_layers.py

# 2. BodyParts3D 피부를 Z-Anatomy 좌표에 맞춰 내보내기 (확인용 렌더: -- --render)
blender -b .cache/zanatomy/Z-Anatomy/Startup.blend --python-exit-code 1 --python tools/export_skin.py

# 3. HRA 여성 골반 장기를 Z-Anatomy 골반에 맞춰 내보내기 (확인용 렌더: -- --render)
blender -b .cache/zanatomy/Z-Anatomy/Startup.blend --python-exit-code 1 --python tools/export_female.py

# 4. 단순화와 meshopt 압축
node tools/compress.mjs
