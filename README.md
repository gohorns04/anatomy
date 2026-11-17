# 몸 탐험

층별로 벗겨 보는 3D 인체 해부 웹앱이에요. 피부, 근육, 뼈, 장기, 혈관, 신경 층을 켜고 끄며 구조물을 눌러 한국어 설명을 볼 수 있어요. 빌드 도구 없이 정적 파일로 동작해요. 런타임 라이브러리는 `vendor/three/`의 three.js 0.170.0 하나뿐이에요.

## 로컬에서 실행

ES 모듈과 `fetch`를 쓰기 때문에 웹 서버를 통해 열어야 해요.

```bash
python3 -m http.server 8123
```

브라우저에서 http://localhost:8123 을 열어요. 같은 와이파이의 아이폰에서는 `http://<Mac IP>:8123` 으로 열 수 있어요.

## 테스트

```bash
npm install
npm test
```

Node 내장 테스트(`tests/`)와 파이썬 `unittest`(`tools/test_*.py`)를 함께 실행해요.

## 구조

- `model/`: 층별 3D 모델(`<layer>.glb`), 이는곳·닿는곳 표시(`insertions.glb`), 메시 목록(`index.json`)
- `data/content.json`: 한국어 내용 (이름, 설명, 이는곳·닿는곳·작용·신경 지배 등)
- `js/viewer.js`: three.js 장면, 로딩, 재질, 탭 선택
- `js/layers.js`, `js/visibility.js`, `js/info.js`, `js/content.js`: 층 상태, 보이기 규칙, 정보 시트, 내용 조회 (순수 함수, 테스트 대상)
- `js/app.js`: 화면 연결
- `tools/`: 모델 변환 파이프라인

## 모델 다시 만들기

원본은 저장소에 넣지 않아요. `.cache/`에 받아 둔 뒤 실행해요.

1. Z-Anatomy `Z-Anatomy.zip`을 받아 `.cache/zanatomy/`에 풀어요 (`Z-Anatomy/Startup.blend`).
2. BodyParts3D `partof_BP3D_4.0_obj_99.zip`과 `partof_element_parts.txt`를 받아 `.cache/bp3d/`에 둬요 (OBJ는 `.cache/bp3d/obj/`에 풀어요).
3. Blender 5.3과 Node가 필요해요.

```bash
npm run build:model
```

층 분리 규칙은 `tools/zanat_rules.py`, 피부 정렬은 `tools/export_skin.py`, 압축 설정은 `tools/compress.mjs`에 있어요. 아이콘은 `blender -b --factory-startup --python tools/render_icon.py`로 다시 만들어요.

## 출처와 라이선스

- Z-Anatomy (Gauthier Kervyn, Marcin Zielinski), CC BY-SA 4.0
- BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

`model/`의 변환된 모델 파일과, 그 모델을 렌더한 아이콘(`icons/`)은 CC BY-SA 4.0으로 배포해요(`model/LICENSE.txt`). 한국어 내용은 표준 해부학 지식을 바탕으로 작성한 교양용 설명이며 의학적 조언이 아니에요.

## GitHub Pages 배포

1. GitHub에 저장소를 만들고 `main` 브랜치를 push해요.
2. 저장소 Settings → Pages에서 Source를 `main` 브랜치의 `/ (root)`로 지정해요.
3. 아이폰 Safari로 주소를 연 뒤 공유 → "홈 화면에 추가"를 눌러요.
