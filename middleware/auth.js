/**
 * 인증 관련 미들웨어
 * 
 * 기능: 세션 기반 사용자 인증 확인, 접근 권한 검사
 * 보안: 로그인 상태 검증, 세션 유효성 확인
 * 사용: 보호된 라우트에서 사용자 인증 필요시 적용
 */

/**
 * 로그인 필수 미들웨어
 * 세션에 학생 정보가 있는지 확인하여 인증 상태 검증
 * 
 * 입력: req (세션 포함), res, next
 * 출력: 인증 실패시 401 에러, 성공시 next() 호출
 * 부작용: 없음
 * 예외: 세션이 없거나 학생 정보가 없는 경우 인증 실패
 */
function requireAuth(req, res, next) {
  // 세션에 학생 정보가 있는지 확인
  if (!req.session || !req.session.student) {
    return res.status(401).json({
      error: '로그인이 필요합니다',
      code: 'AUTH_REQUIRED'
    });
  }

  // 학생 정보가 유효한지 확인
  const student = req.session.student;
  if (!student.email || !student.name) {
    return res.status(401).json({
      error: '유효하지 않은 세션입니다. 다시 로그인해주세요',
      code: 'INVALID_SESSION'
    });
  }

  // 인증 성공 - 다음 미들웨어로 진행
  next();
}

/**
 * 선택적 인증 미들웨어
 * 로그인 상태를 확인하지만 필수는 아님 (게스트도 접근 가능한 경우)
 * 
 * 입력: req, res, next
 * 출력: 항상 next() 호출 (인증 실패해도 진행)
 * 부작용: req.isAuthenticated 플래그 설정
 * 예외: 없음 (에러 발생시에도 진행)
 */
function optionalAuth(req, res, next) {
  // 인증 상태 플래그 설정
  req.isAuthenticated = !!(req.session && req.session.student);
  
  // 인증된 경우 사용자 정보도 설정
  if (req.isAuthenticated) {
    req.user = req.session.student;
  }

  next();
}

/**
 * 관리자 권한 확인 미들웨어 (확장용)
 * 현재는 기본 구현만 제공, 실제 관리자 권한 시스템 구현시 확장
 * 
 * 입력: req, res, next
 * 출력: 권한 없음시 403 에러, 성공시 next() 호출
 * 부작용: 없음
 * 예외: 관리자가 아닌 경우 접근 거부
 */
function requireAdmin(req, res, next) {
  // 먼저 로그인 상태 확인
  if (!req.session || !req.session.student) {
    return res.status(401).json({
      error: '로그인이 필요합니다',
      code: 'AUTH_REQUIRED'
    });
  }

  // 관리자 권한 확인 (실제 구현에서는 DB에서 역할 확인)
  const isAdmin = req.session.student.email.includes('admin') || 
                  req.session.student.role === 'admin';

  if (!isAdmin) {
    return res.status(403).json({
      error: '관리자 권한이 필요합니다',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
}

/**
 * API 키 인증 미들웨어 (외부 API 연동용)
 * 헤더의 API 키를 확인하여 외부 서비스 접근 권한 검증
 * 
 * 입력: req (Authorization 헤더 포함), res, next
 * 출력: API 키 무효시 401 에러, 성공시 next() 호출
 * 부작용: 없음
 * 예외: API 키가 없거나 유효하지 않은 경우
 */
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  const validApiKey = process.env.API_KEY;

  // API 키가 설정되지 않은 경우 개발모드에서는 통과
  if (!validApiKey && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ API 키가 설정되지 않았습니다 (개발모드)');
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({
      error: 'API 키가 필요합니다',
      code: 'API_KEY_REQUIRED'
    });
  }

  // Bearer 토큰 형태인 경우 추출
  const token = apiKey.startsWith('Bearer ') ? apiKey.slice(7) : apiKey;

  if (token !== validApiKey) {
    return res.status(401).json({
      error: '유효하지 않은 API 키입니다',
      code: 'INVALID_API_KEY'
    });
  }

  next();
}

/**
 * 세션 만료 시간 연장 미들웨어
 * 활성 사용자의 세션 만료 시간을 자동으로 연장
 * 
 * 입력: req, res, next
 * 출력: 항상 next() 호출
 * 부작용: 세션 만료 시간 갱신
 * 예외: 없음
 */
function extendSession(req, res, next) {
  // 로그인된 사용자의 경우 세션 만료 시간 연장
  if (req.session && req.session.student) {
    req.session.touch(); // 세션 만료 시간 갱신
  }

  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireApiKey,
  extendSession
};