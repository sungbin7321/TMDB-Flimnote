# 필름노트 — TMDB 영화 검색 및 찜 목록

Vanilla JavaScript + Node.js/Express로 만든 한국어 영화 검색 서비스입니다. 별도 프론트엔드 빌드나 데이터베이스가 필요하지 않습니다.

## 실행하기

1. Node.js 22 이상과 npm을 설치합니다.
2. 터미널에서 이 README가 있는 프로젝트 폴더로 이동합니다.
3. `npm ci`로 의존성을 설치합니다. lock 파일을 변경하며 설치하려면 `npm install`을 사용합니다.
4. `.env.example`을 참고해 **직접** `.env` 파일을 만듭니다. 이 프로젝트에는 `.env`와 실제 토큰이 포함되어 있지 않습니다.

   ```dotenv
   TMDB_ACCESS_TOKEN=여기에_실제_API_Read_Access_Token
   PORT=3000
   ```

   [TMDB 계정 API 설정](https://www.themoviedb.org/settings/api)에서 **API Read Access Token**을 확인합니다. API Key와 구별하며, 값 앞에 `Bearer `를 붙이지 않습니다. 서버가 접두사를 붙입니다. 운영 환경에서는 파일 대신 호스팅 서비스의 환경변수로 설정할 수 있습니다.

5. `npm run dev` 또는 `npm start`로 실행합니다.
6. 브라우저에서 <http://localhost:3000>을 엽니다. HTML 파일을 직접 더블클릭하지 마세요.

`npm run dev`는 서버 코드 변경 시 자동 재시작합니다. 화면 파일 변경은 브라우저 새로고침으로 확인합니다. 환경변수 변경 후에는 서버를 재시작하세요. `PORT`를 바꿨다면 접속 주소의 포트도 바꿉니다.

토큰을 설정하지 않아도 화면은 열리며, 검색 시 설정 안내가 표시됩니다. 실제 TMDB 연결에는 유효한 토큰과 인터넷 연결이 필요합니다.

## 폴더와 역할

```text
tmdb-movie-service/
├── public/
│   ├── index.html           # 한국어 화면, 검색 폼, 모달
│   ├── css/style.css        # 반응형 디자인
│   └── js/
│       ├── app.js           # 화면 상태, 이벤트, 검색·상세 요청 취소
│       ├── api.js           # 우리 서버 호출, 포스터 URL
│       ├── ui.js            # 카드·모달 DOM 생성
│       └── favorites.js     # localStorage 읽기·쓰기·검증
├── server/server.js        # 정적 파일 제공 및 TMDB 프록시
├── test/                   # 토큰 없이 실행되는 자동 테스트
├── .env.example            # 설정 예시
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

`api.js`, `ui.js`, `favorites.js`는 브라우저 모듈이므로 `public/js/`에 함께 두었습니다.

## 사용 기능

- 제목 검색: 검색 버튼 또는 Enter. 검색어는 1~100자입니다.
- 카드: 포스터, 제목, 개봉일, TMDB 평점(10점 기준). 없는 정보는 안내 문구로 대체합니다.
- 카드 클릭: 한국어 줄거리, 장르, 상영시간, 개봉일, 평점이 있는 상세 모달.
- 모달 닫기: 닫기 버튼, Escape, 모달 바깥 클릭. 네이티브 `dialog`로 키보드 포커스를 관리합니다.
- 찜 추가/해제와 나의 찜 목록. 새로고침 후에도 유지하며 다른 탭의 변경도 반영합니다.
- 검색 결과 이전/다음 페이지. TMDB 응답의 전체 페이지 수와 최대 500페이지 범위에서 이동합니다.
- 로딩, 빈 결과, 네트워크/인증/요청 제한/시간 초과 처리와 재시도.
- 포스터 누락·이미지 로드 실패 및 localStorage 접근·저장 실패 처리.
- 모바일 화면과 키보드 탐색, 동작 줄이기 설정 대응.

## 데이터 흐름 및 API

```text
브라우저 → 같은 출처의 /api/movies/... → Express → TMDB
브라우저 → TMDB 이미지 CDN (공개 포스터, 토큰 불필요)
브라우저 ↔ localStorage (찜 목록)
```

| 우리 서버 | TMDB API v3 | 설명 |
| --- | --- | --- |
| `GET /api/movies/search?query=인터스텔라&page=1` | `/search/movie` | `language=ko-KR`, `include_adult=false` |
| `GET /api/movies/157336` | `/movie/157336` | `language=ko-KR` |

서버만 `TMDB_ACCESS_TOKEN`을 읽고 `Authorization: Bearer <token>` 헤더를 만듭니다. TMDB 주소는 서버에 고정되어 있으며 사용자가 임의 외부 주소를 지정할 수 없습니다. 요청은 10초 후 시간 초과 처리합니다. 브라우저에는 TMDB 토큰을 전달하지 않으며 `public/`만 정적 공개합니다. 외부 오류 원문도 그대로 노출하지 않습니다.

포스터는 공식 문서 예시에 따라 `https://image.tmdb.org/t/p/w500` + `poster_path`로 표시합니다. 현재는 w500을 고정하며 향후 여러 크기를 지원하려면 `/configuration`의 `images.secure_base_url`, `poster_sizes`를 서버에서 조회·캐시하도록 확장할 수 있습니다.

한국어 정보가 TMDB에 없으면 원제 또는 한국어 줄거리 없음 안내가 나타날 수 있습니다. `ko-KR`가 없는 번역까지 생성해 주는 것은 아닙니다.

## 찜 목록과 보안

- 키: `film-note:favorites:v1`. ID, 제목, 포스터 경로, 개봉일, 평점만 저장합니다.
- 계정·서버 저장이 없으므로 브라우저, 사이트 주소, 포트가 다르면 목록을 공유하지 않습니다. 브라우저 데이터 삭제 시 찜도 삭제됩니다.
- 손상되거나 차단된 저장소는 경고하며, 쓰기 실패 시 성공한 것으로 표시하지 않습니다.
- 여러 탭의 변경은 `storage` 이벤트로 반영합니다. 동시에 저장할 경우 마지막 저장이 우선합니다.
- 외부 영화 문자열은 `textContent`로 렌더링합니다. HTML 문자열로 삽입하지 않습니다.
- `.gitignore`는 `.env`, `.env.*`, `node_modules/` 등을 제외하고 `.env.example`만 허용합니다.
- 공개 배포 전에는 사용량에 맞춘 요청 제한, 캐시, HTTPS, 접근 정책을 추가하는 것이 좋습니다. 현재는 학습·개발용 서버입니다.

## 검증

```sh
npm test
```

Node 내장 테스트 러너와 가짜 TMDB 응답으로 검색 파라미터·Bearer 헤더·한국어·상세 조회·입력 검증·상태 코드·시간 초과·정적 파일·비공개 파일 차단·찜 저장 및 손상 복구·이미지 경로를 확인합니다. 테스트에 실제 토큰은 필요하지 않습니다.

실제 토큰 설정 후에는 다음을 직접 확인해 보세요.

1. `인터스텔라` 검색 → 카드 클릭 → 상세정보 확인 → Escape로 닫기.
2. 찜 추가 → 나의 찜 → 새로고침 → 찜 유지 → 삭제.
3. 결과가 많은 제목으로 다음/이전 페이지 이동.
4. 검색을 연달아 실행해 마지막 검색 결과가 유지되는지 확인.
5. 모바일 폭, 키보드 Tab 이동, 네트워크 차단 후 오류·재시도 확인.

실제 토큰이 제공되지 않아 라이브 TMDB 인증 및 실제 데이터 응답은 별도 확인이 필요합니다.

구현 시 자동 테스트 9개를 통과했습니다. 브라우저에서는 가짜 응답으로 Enter 검색, 페이지 이동, 상세 모달, Escape 닫기, 찜 추가·삭제, 새로고침 후 저장 유지와 포커스 복귀를 확인했습니다. 실제 서버의 토큰 미설정 안내와 좁은 화면 레이아웃도 확인했습니다. 가짜 응답 서버는 배포 코드에 포함하지 않았습니다.

## 확인한 공식 문서

2026-09-22 확인:

- [영화 검색](https://developer.themoviedb.org/reference/search-movie)
- [영화 상세정보](https://developer.themoviedb.org/reference/movie-details)
- [애플리케이션 Bearer 인증](https://developer.themoviedb.org/docs/authentication-application)
- [이미지 URL 구성](https://developer.themoviedb.org/docs/image-basics)

This product uses the TMDB API but is not endorsed or certified by TMDB.
영화 데이터와 이미지는 TMDB에서 제공합니다. 공개 서비스 운영 시 [TMDB FAQ](https://developer.themoviedb.org/docs/faq)의 사용·출처 표시 조건도 확인하세요.
