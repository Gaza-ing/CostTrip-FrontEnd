# CostTrip-FrontEnd

여행 계획 단계의 예산 수립과 여행 중 실제 지출 추적을 한 곳에서 관리하는 웹 서비스입니다.

## 기술 스택

| 영역          | 도구                   | 버전   |
| ------------- | ---------------------- | ------ |
| 프레임워크    | Next.js (App Router)   | 16.3.0 |
| UI 라이브러리 | React                  | 19.2.8 |
| 언어          | TypeScript (strict)    | 5.x    |
| 스타일링      | Tailwind CSS + PostCSS | 4.x    |
| 패키지 매니저 | npm                    | —      |

## 코드 품질 도구

| 도구        | 역할                             | 동작 시점              |
| ----------- | -------------------------------- | ---------------------- |
| ESLint      | 코드 린트 (core-web-vitals + TS) | 커밋 시 자동 + CI      |
| Prettier    | 코드 포맷 통일                   | 커밋 시 자동 + CI      |
| husky       | Git hook 실행기                  | pre-commit, commit-msg |
| lint-staged | 변경 파일만 lint/format          | pre-commit hook        |
| commitlint  | 커밋 메시지 규칙 강제            | commit-msg hook        |

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## npm scripts

| 명령어                 | 동작                  |
| ---------------------- | --------------------- |
| `npm run dev`          | 개발 서버             |
| `npm run build`        | 프로덕션 빌드         |
| `npm run lint`         | ESLint 실행           |
| `npm run format`       | Prettier로 전체 포맷  |
| `npm run format:check` | 포맷 위반 확인 (CI용) |

## 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따릅니다.

```
<type>(<scope>): <소문자 시작 subject>
```

| type     | 용도                       |
| -------- | -------------------------- |
| feat     | 새 기능                    |
| fix      | 버그 수정                  |
| chore    | 설정, 빌드, 의존성 등      |
| style    | 코드 포맷 (동작 변경 없음) |
| refactor | 리팩토링                   |
| docs     | 문서                       |
| test     | 테스트                     |

예시: `feat(trip): 여행 생성 페이지 추가`, `fix(ci): 빌드 오류 수정`

## CI/CD

GitHub Actions로 PR 및 main push 시 자동 실행됩니다.

- **환경**: ubuntu-latest, Node 22
- **파이프라인**: install → lint → format:check → build

## 프로젝트 구조

```
CostTrip-FrontEnd/
├── .github/
│   ├── workflows/ci.yml         # CI 파이프라인
│   └── pull_request_template.md # PR 템플릿
├── .husky/
│   ├── pre-commit               # lint-staged 실행
│   └── commit-msg               # commitlint 실행
├── docs/spec/                   # 서브모듈 (CostTrip-Spec 레포)
├── public/                      # 정적 에셋
├── src/app/                     # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── favicon.ico
├── .editorconfig                # 에디터 공통 규칙
├── .prettierrc                  # Prettier 설정
├── .prettierignore              # Prettier 제외
├── commitlint.config.mjs        # 커밋 메시지 규칙
├── eslint.config.mjs            # ESLint 설정
├── next.config.ts               # Next.js 설정
├── package.json                 # 의존성 + scripts
├── postcss.config.mjs           # PostCSS/Tailwind
└── tsconfig.json                # TypeScript 설정
```

## 스펙 문서

기획/스펙은 서브모듈로 별도 관리됩니다.

```bash
# 서브모듈 포함 클론
git clone --recurse-submodules https://github.com/Gaza-ing/CostTrip-FrontEnd.git
```

스펙 레포: [Gaza-ing/CostTrip-Spec](https://github.com/Gaza-ing/CostTrip-Spec)
