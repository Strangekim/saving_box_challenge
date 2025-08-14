/**
 * 학생 인증 라우터
 * 
 * 역할: 라우트 정의 및 미들웨어 조합
 * 컨트롤러와 서비스는 별도 파일로 분리
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateInput, handleServiceError } = require('../middleware/validation');
const authSchemas = require('../schemas/authSchemas');
const authController = require('../controllers/authController');
const router = express.Router();

// POST /api/auth/signup - 회원가입
router.post('/signup', 
  validateInput(authSchemas.signup),
  handleServiceError(authController.signupController)
);

// POST /api/auth/login - 로그인
router.post('/login',
  validateInput(authSchemas.login),
  handleServiceError(authController.loginController)
);

// POST /api/auth/logout - 로그아웃
router.post('/logout', 
  authController.logoutController
);

// GET /api/auth/me - 현재 사용자 정보
router.get('/me', 
  requireAuth, 
  authController.getCurrentUserController
);

module.exports = router;