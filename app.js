/**
 * 신한은행 헤이영 캠퍼스 백엔드 서버 메인 파일
 * 
 * 기능: Express 서버 설정, 미들웨어 구성, 라우터 연결, 서버 시작
 * 입력: 환경변수 (PORT, DB_URL, SESSION_SECRET 등)
 * 출력: HTTP 서버 실행 및 로그 출력
 * 예외: 서버 시작 실패시 에러 로그 출력 후 프로세스 종료
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');

// 라우터 모듈 가져오기
const authRoutes = require('./routes/auth');
const savingsRoutes = require('./routes/savings');
const rankingRoutes = require('./routes/ranking');
const achievementRoutes = require('./routes/achievement');
const communityRoutes = require('./routes/community');
const universityRoutes = require('./routes/university');

// 데이터베이스 설정
const { testConnection, initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정 (개발환경용 - 운영시 도메인 제한 필요)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// JSON 파싱 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정 (학생 인증용)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS에서만 true
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

// 기본 라우트 (헬스체크)
app.get('/', (req, res) => {
  res.json({
    message: '신한은행 헤이영 캠퍼스 API 서버',
    version: '2.0.0',
    status: 'running',
    database: 'PostgreSQL',
    features: [
      '사용자 인증 (대학 이메일 기반)',
      '적금통 관리 (실제 DB 연동)',
      '대학별 랭킹 시스템',
      '룰 엔진 기반 업적 시스템',
      '커뮤니티 기능',
      '대학 정보 관리'
    ]
  });
});

// API 라우터 연결
app.use('/api/auth', authRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/achievement', achievementRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/university', universityRoutes);

// 404 에러 핸들링
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API 경로를 찾을 수 없습니다',
    path: req.originalUrl,
    availableRoutes: [
      '/api/auth - 인증 관련',
      '/api/savings - 적금통 관리',
      '/api/ranking - 랭킹/챌린지',
      '/api/achievement - 업적 시스템',
      '/api/community - 커뮤니티',
      '/api/university - 대학 정보'
    ]
  });
});

// 전역 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('서버 에러:', err.stack);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? '서버 오류가 발생했습니다' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 데이터베이스 초기화 및 서버 시작
async function startServer() {
  try {
    // 데이터베이스 연결 테스트
    console.log('🔗 데이터베이스 연결 확인 중...');
    const isDbConnected = await testConnection();
    if (!isDbConnected) {
      console.error('❌ 데이터베이스 연결에 실패했습니다. 서버를 시작할 수 없습니다.');
      process.exit(1);
    }

    // 데이터베이스 테이블 초기화
    console.log('🛠️ 데이터베이스 테이블 초기화 시작...');
    const isDbInitialized = await initializeDatabase();
    if (!isDbInitialized) {
      console.error('❌ 데이터베이스 초기화에 실패했습니다.');
    }

    // 서버 시작
    app.listen(PORT, () => {
      console.log(`🚀 헤이영 캠퍼스 서버가 포트 ${PORT}에서 실행중입니다`);
      console.log(`📖 API 문서: http://localhost:${PORT}/`);
      console.log(`📊 데이터베이스 연결: PostgreSQL`);
      console.log(`🎯 새로운 기능:`);
      console.log(`   - 실제 DB 연동 (Mock 데이터에서 업그레이드)`);
      console.log(`   - 대학별 사용자 관리`);
      console.log(`   - 적금통 진행 상황 추적`);
      console.log(`   - 코스메틱 아이템 시스템 준비`);
    });
    
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();