# 몸 탐험

몸 그림을 눌러 근육과 뼈를 알아보는 모바일 웹앱이에요. 빌드 도구나 외부 라이브러리 없이 HTML, CSS, JS, SVG로만 만들었어요.

## 로컬에서 실행

`fetch`로 데이터를 읽기 때문에 파일을 직접 열면 안 되고, 웹 서버를 통해 열어야 해요.

```bash
python3 -m http.server 8123
```

브라우저에서 http://localhost:8123 을 열어요.

## 테스트

```bash
npm test
```

Node 18 이상의 내장 테스트 러너를 써요.

## 구조

- `data/parts.json`: 부위 콘텐츠 (이름, 설명, 재미있는 사실)
- `js/regions.js`: 몸 그림 좌표 (viewBox 200×500)
- `js/model.js`: 데이터 검증과 조회
- `js/body-svg.js`, `js/sheet.js`: 그림과 정보 시트 렌더링
- `js/state.js`: 화면 상태 전환
- `js/app.js`: 화면 연결

부위를 추가하려면 `parts.json`과 `regions.js`에 같은 id로 항목을 넣고 `npm test`를 실행해요.

## GitHub Pages 배포

1. GitHub에 저장소를 만들고 이 폴더를 `main` 브랜치로 push해요.
2. 저장소 Settings → Pages에서 Source를 `main` 브랜치의 `/ (root)`로 지정해요.
3. 몇 분 뒤 `https://<사용자명>.github.io/<저장소명>/`에서 열려요.

## 아이폰 홈 화면에 추가

Safari로 주소를 연 뒤 공유 버튼 → "홈 화면에 추가"를 누르면 앱처럼 전체 화면으로 열려요.
