# 신체 해부학 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앞면·뒷면 2D 몸 그림에서 근육·뼈 부위를 눌러 설명을 보는 모바일 웹앱(아이폰 홈 화면 추가용)을 만든다.

**Architecture:** 빌드 도구 없는 정적 사이트. 콘텐츠(`data/parts.json`)와 그림 좌표(`js/regions.js`)를 분리하고, 순수 함수 모듈(`model.js`, `body-svg.js`, `sheet.js`)은 Node 내장 테스트로 검증하며, DOM 연결(`app.js`)만 브라우저에서 확인한다. 나중에 3D(three.js)를 붙일 때 `parts.json`과 `model.js`를 그대로 재사용한다.

**Tech Stack:** HTML, CSS, 바닐라 JS(ES 모듈), 인라인 SVG, `node --test` (Node 26). 외부 의존성 0.

**Spec:** `docs/superpowers/specs/2026-11-17-anatomy-app-design.md`

## Global Constraints

- 프로젝트 루트: `/Users/brandon/PJT/anatomy`
- 외부 라이브러리·빌드 도구·npm 패키지 없음. 테스트는 `node --test tests/`.
- 계층: `muscle`(근육계), `bone`(골격계) 두 가지. 장기 없음.
- 면: `front`, `back`.
- 모든 부위는 한국어 이름 + 영어 + 라틴어 용어를 가진다.
- 퀴즈·계정·의학 조언 없음. 설명은 교양 수준, 쉬운 한국어, 해부학적으로 정확하게.
- 첫 버전 부위는 31개 (아래 Task 2 목록).
- 아이폰 Safari 세로 화면 기준(폭 375–430px), 노치 safe-area 대응, "홈 화면에 추가" 지원.
- 그림은 직접 만든 단순화 도식 SVG. 외부 이미지 사용 안 함.

## Review Focus

1. **부위 밖(빈 곳·몸 윤곽)을 누름** → 아무 부위도 선택되지 않고, 열린 시트가 있으면 닫힌다. (Task 4 `resolveTap` 테스트)
2. **시트가 열린 상태에서 계층·면 전환** → 시트가 닫히고 선택이 해제된다. 다른 면에 없는 부위가 선택된 채 남지 않는다. (Task 4 `nextState` 테스트)
3. **좌우 한 쌍인 부위(이두근 등)** → 왼쪽·오른쪽 어느 쪽을 눌러도 같은 부위가 열리고 양쪽 모두 강조된다. (Task 3 테스트)
4. **설명 문자열에 `<`, `&` 등 특수문자** → 그대로 글자로 보이고 HTML로 해석되지 않는다. (Task 3 `renderSheet` 테스트)
5. **`file://`로 직접 열기 / JSON 로드 실패** → 빈 화면 대신 "데이터를 불러오지 못했어요" 안내가 보인다. (Task 4 수동 확인 + `app.js` 에러 처리)

---

### Task 1: 프로젝트 골격과 데이터 모델

**Files:**
- Create: `.gitignore`, `package.json`(테스트 스크립트만), `js/model.js`
- Test: `tests/model.test.js`

**Interfaces:**
- Produces (`js/model.js`, 모두 named export):
  - `SYSTEMS = ['muscle','bone']`, `SIDES = ['front','back']`
  - `validateParts(parts: Part[]) -> string[]` — 오류 메시지 배열(정상이면 `[]`)
  - `partsForView(parts: Part[], system: string, side: string) -> Part[]`
  - `findPart(parts: Part[], id: string) -> Part | null`
- `Part` 형태: `{ id: string, system: 'muscle'|'bone', sides: ('front'|'back')[], name_ko, name_en, name_la, summary, fact }` (모두 비어 있지 않은 문자열, `sides` 길이 ≥ 1)

- [ ] **Step 1:** `git init`, `.gitignore`(`.DS_Store`, `node_modules/`), `package.json`에 `{"type":"module","scripts":{"test":"node --test tests/"}}`.
- [ ] **Step 2: 실패하는 테스트 작성** — `tests/model.test.js`:
  - `validateParts([valid])` → `[]`
  - id 중복 → 메시지에 중복 id 포함
  - `system: 'organ'` → 오류 1개 이상
  - `sides: []` → 오류 1개 이상
  - `name_la: ''` → 오류 1개 이상
  - `partsForView`가 system·side 둘 다 맞는 것만 반환 (`sides: ['front','back']`인 부위는 양면 모두 포함)
  - `findPart(parts,'없는id')` → `null`
- [ ] **Step 3:** `npm test` → FAIL (모듈 없음)
- [ ] **Step 4:** `js/model.js` 구현
- [ ] **Step 5:** `npm test` → PASS
- [ ] **Step 6:** 커밋 `feat: add part data model`

### Task 2: 부위 콘텐츠 (parts.json)

**Files:**
- Create: `data/parts.json` (`Part[]`)
- Test: `tests/parts-data.test.js`

**Interfaces:**
- Consumes: `validateParts`, `SYSTEMS`, `SIDES` (Task 1)
- Produces: `data/parts.json` — 아래 31개 id 고정

근육(15): `deltoid`(삼각근, front+back), `pectoralis-major`(대흉근, front), `biceps-brachii`(위팔두갈래근/이두근, front), `triceps-brachii`(위팔세갈래근/삼두근, back), `forearm-flexors`(전완 굽힘근군, front), `rectus-abdominis`(복직근, front), `external-oblique`(외복사근, front), `quadriceps`(대퇴사두근, front), `tibialis-anterior`(전경골근, front), `sternocleidomastoid`(흉쇄유돌근, front), `trapezius`(승모근, back), `latissimus-dorsi`(광배근, back), `gluteus-maximus`(대둔근, back), `hamstrings`(햄스트링, back), `gastrocnemius`(비복근, back)

뼈(16): `skull`(두개골, front+back), `clavicle`(쇄골, front), `scapula`(견갑골, back), `sternum`(흉골, front), `ribs`(갈비뼈, front+back), `vertebral-column`(척추, back), `humerus`(상완골, front+back), `radius`(요골, front), `ulna`(척골, front+back), `hand-bones`(손뼈, front+back), `pelvis`(골반, front+back), `femur`(대퇴골, front+back), `patella`(슬개골, front), `tibia`(경골, front), `fibula`(비골, front+back), `foot-bones`(발뼈, front+back)

- `summary`: 1–2문장, 이 부위가 하는 일. `fact`: 1문장, 흥미로운 사실. 존댓말 "~해요" 체.
- [ ] **Step 1: 실패하는 테스트** — `parts.json`을 `fs`로 읽어: `validateParts` → `[]`; 길이 31; 위 id 집합과 정확히 일치; muscle 15개·bone 16개; 각 id의 `sides`가 위 목록과 일치.
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** `data/parts.json` 작성 (용어는 대한해부학회 용어/일반 통용 명칭, 라틴어는 Terminologia Anatomica 기준)
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** 커밋 `feat: add anatomy content for 31 parts`

### Task 3: 몸 그림 SVG와 정보 시트 렌더링

**Files:**
- Create: `js/regions.js`, `js/body-svg.js`, `js/sheet.js`
- Test: `tests/render.test.js`

**Interfaces:**
- Consumes: `Part`, `partsForView` (Task 1), `parts.json` (Task 2)
- Produces:
  - `js/regions.js`: `VIEWBOX = '0 0 200 500'`; `SILHOUETTE = { front: string, back: string }`(SVG path d); `REGIONS = { [partId]: { front?: string[], back?: string[] } }` — 각 원소는 path d. 좌우 쌍 부위는 path 2개.
  - `js/body-svg.js`: `renderBody(parts: Part[], system, side, selectedId: string|null) -> string` — `<svg viewBox=VIEWBOX>` 안에 실루엣 `<path class="silhouette">` + 부위마다 `<g class="part" data-part-id="ID">`(path들) 를 반환. 선택된 부위 `<g>`에 `selected` 클래스 추가.
  - `js/sheet.js`: `escapeHtml(s: string) -> string`; `renderSheet(part: Part) -> string` — `name_ko`, `name_en · name_la`, `summary`, `fact`를 담은 HTML. 모든 텍스트는 `escapeHtml` 통과.
- 그림: 정면을 바라보는 중성적 인체, 뒷면은 좌우가 해부학적으로 반전(뒷면에서 왼쪽 화면 = 몸의 왼쪽). 부위 path는 실제 위치에 맞게 근사하고 실루엣 안에 들어가야 한다.

- [ ] **Step 1: 실패하는 테스트:**
  - `parts.json`의 모든 부위·모든 `sides`에 대해 `REGIONS[id][side]`가 길이 ≥ 1 배열; `REGIONS`에 parts.json에 없는 id 없음.
  - `renderBody(parts,'muscle','front',null)` 출력의 `data-part-id` 집합 == `partsForView(...)`의 id 집합.
  - `renderBody(parts,'muscle','front','biceps-brachii')`: `data-part-id="biceps-brachii"`인 `<g>`에 `selected` 포함, 그 안에 `<path` 2개.
  - `renderSheet({...name_ko:'<b>&'})` 출력에 `&lt;b&gt;&amp;` 포함, `<b>` 미포함.
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 세 파일 구현
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** 커밋 `feat: render body svg and info sheet`

### Task 4: 화면 연결과 상호작용

**Files:**
- Create: `index.html`, `css/style.css`, `js/state.js`, `js/app.js`
- Test: `tests/state.test.js`

**Interfaces:**
- Consumes: Task 1–3 전부
- Produces (`js/state.js`):
  - `initialState() -> { system:'muscle', side:'front', selectedId:null }`
  - `nextState(state, action) -> state` — action: `{type:'setSystem', system}`, `{type:'setSide', side}`, `{type:'select', id}`, `{type:'close'}`. `setSystem`/`setSide`는 값이 바뀌면 `selectedId`를 `null`로.
  - `resolveTap(target: {closest(sel): {dataset:{partId}}|null}) -> string|null` — `.part` 조상의 `data-part-id`, 없으면 `null`.
- 화면: 상단 계층 세그먼트(근육/뼈), 면 토글(앞/뒤), 가운데 몸 SVG, 하단에서 올라오는 시트(닫기 버튼, 바깥 탭으로 닫힘). 부위 탭 시 강조 + 시트. 빈 곳 탭 시 `close`.
- `app.js`: `fetch('data/parts.json')` 실패 시 본문에 "데이터를 불러오지 못했어요" 표시. 이벤트는 SVG 컨테이너에 위임.
- CSS: `viewport-fit=cover`, `env(safe-area-inset-*)` 적용, `touch-action: manipulation`(더블탭 확대 방지), 다크 모드 대응.

- [ ] **Step 1: 실패하는 테스트:** `nextState`의 네 action; 선택된 상태에서 `setSide`로 다른 면 → `selectedId === null`; 같은 면으로 `setSide` → 선택 유지; `resolveTap`에 `closest`가 `null` 반환하는 가짜 객체 → `null`, `{dataset:{partId:'skull'}}` 반환 → `'skull'`.
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** `state.js` 구현 → `npm test` PASS
- [ ] **Step 4:** `index.html`, `css/style.css`, `app.js` 구현
- [ ] **Step 5: 브라우저 확인** — `.claude/launch.json`에 `python3 -m http.server 8000` 등록 후 preview로 열기. 모바일 크기(375×812)에서: 4가지 계층·면 조합 모두 그림 표시, 부위 탭 → 시트, 빈 곳 탭 → 닫힘, 시트 열고 면 전환 → 닫힘, 콘솔 에러 없음. `data/parts.json` 이름을 잠시 바꿔 에러 안내 확인 후 원복. 스크린샷 첨부.
- [ ] **Step 6:** 커밋 `feat: wire up interactive body viewer`

### Task 5: 홈 화면 추가 지원과 배포 준비

**Files:**
- Create: `manifest.webmanifest`, `icons/icon-180.png`, `icons/icon-512.png`(직접 그린 SVG에서 생성), `README.md`
- Modify: `index.html` (`<link rel="manifest">`, `apple-touch-icon`, `apple-mobile-web-app-capable`, `theme-color`)

- [ ] **Step 1:** 매니페스트(`name: "몸 탐험"`, `display: "standalone"`, 세로 방향)와 아이콘 추가, `index.html` 메타 태그.
- [ ] **Step 2: 확인** — preview에서 manifest·아이콘 요청이 200, 콘솔 에러 없음. `npm test` PASS.
- [ ] **Step 3:** `README.md`에 로컬 실행법과 GitHub Pages 배포 방법(저장소 Settings → Pages → main 브랜치 루트) 기록.
- [ ] **Step 4:** 커밋 `feat: add home screen support`
- [ ] **Step 5: 배포 (사용자 확인 필수)** — 이 Mac에 `gh`가 없음. 사용자에게 GitHub 저장소 생성·push 방법을 확인받은 뒤에만 진행. 공개 저장소에 올라가는 외부 공개 행위이므로 승인 없이 push하지 않는다.
