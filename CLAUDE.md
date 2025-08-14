# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요
신한은행 헤이영 캠퍼스 백엔드 서버 - 대학생 대상 적금/커뮤니티 서비스

### 핵심 기능 (MVP)
1. **학생 인증**: 학교 이메일 기반 회원가입/로그인 (Mock)
2. **적금통 관리**: 목표금액/기간 설정, Mock 입금, 진척도 추적
3. **랭킹 & 챌린지**: 학교/학과별 랭킹, 주간 챌린지 참여
4. **업적 시스템**: 룰 엔진 기반 조건-보상 시스템 (확장 가능)
5. **커뮤니티**: 적금통 공유, 좋아요, 댓글 (기본 모더레이션)

## Tech Stack
- **Framework**: Express.js
- **Language**: Node.js
- **Database**: PostgreSQL
- **Authentication**: Express Session
- **Validation**: Joi

## Development Commands

### Server
```bash
npm start          # 프로덕션 서버 실행
npm run dev        # 개발 서버 실행 (nodemon)
npm test           # 테스트 실행
```

### Database Setup
1. PostgreSQL 설치 및 실행
2. `.env` 파일 생성 (`.env.example` 참고)
3. 서버 시작시 자동으로 테이블 생성됨

## Architecture

### Directory Structure
```
├── app.js              # 메인 서버 파일
├── routes/             # API 라우터들
│   ├── auth.js         # 학생 인증 (회원가입/로그인)
│   ├── savings.js      # 적금통 CRUD
│   ├── ranking.js      # 랭킹/챌린지
│   ├── achievement.js  # 업적 시스템 (룰 엔진)
│   └── community.js    # 커뮤니티 (게시글/댓글)
├── middleware/
│   └── auth.js         # 인증 미들웨어
├── config/
│   └── database.js     # PostgreSQL 연결
└── models/             # (향후 확장용)
```

### API Structure
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/savings` - 내 적금통 조회
- `POST /api/savings` - 적금통 생성
- `POST /api/savings/:id/deposit` - 입금 (Mock)
- `GET /api/ranking/school` - 학교 랭킹
- `GET /api/achievement` - 업적 목록
- `POST /api/community/posts` - 게시글 작성

### Key Features

#### 1. Mock Authentication
- 학교 이메일 패턴 검증 (`@대학.ac.kr`)
- bcrypt 패스워드 해싱
- Express Session 기반 인증

#### 2. Rule Engine (업적 시스템)
- JSON 기반 조건 정의
- 동적 조건 평가 (`>=`, `>`, `==` 등)
- 확장 가능한 보상 시스템 (포인트, 배지, 타이틀)

#### 3. Security
- 입력값 검증 (Joi)
- 세션 기반 인증
- 환경변수로 민감정보 관리
- 기본적인 욕설 필터링

## Development Guidelines
- **주석**: 모든 함수에 한글 주석 (입력/출력/부작용/예외 명시)
- **보안**: 환경변수 사용, 입력 검증 필수
- **에러 처리**: try-catch 및 적절한 HTTP 상태코드
- **Mock 데이터**: 실제 은행 API 대신 시뮬레이션 사용

## update list
- 이 아래에 넘버링을 하여 코드를 수정할 때마다 업데이트 내용 개괄을 적을 것