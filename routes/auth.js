/**
 * 학생 인증 라우터 - 서비스와 미들웨어 조합 방식
 * 
 * 구조: 라우터 = 미들웨어 + 서비스 조합
 * 역할: HTTP 요청/응답 처리, 서비스 레이어 호출
 * 검증: Joi 스키마 기반 입력값 검증
 */

const express = require('express');
const Joi = require('joi');
const authService = require('../services/authService');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// 입력값 검증 스키마
const schemas = {
  signup: Joi.object({
    email: Joi.string().email().pattern(/@[a-zA-Z]+\.ac\.kr$/).required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).max(20).required(),
    department: Joi.string().min(2).max(30).required(),
    studentId: Joi.string().pattern(/^\d{8,10}$/).required()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

/**
 * 입력값 검증 미들웨어 생성 함수
 * 
 * @param {Object} schema - Joi 검증 스키마
 * @returns {Function} Express 미들웨어 함수
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    req.validatedData = value;
    next();
  };
};

/**
 * 에러 처리 미들웨어
 * 
 * @param {Function} serviceFunction - 서비스 함수
 * @returns {Function} Express 미들웨어 함수
 */
const handleServiceError = (serviceFunction) => {
  return async (req, res, next) => {
    try {
      await serviceFunction(req, res, next);
    } catch (error) {
      console.error('서비스 에러:', error);
      res.status(400).json({ error: error.message });
    }
  };
};

/**
 * 회원가입 컨트롤러 함수
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const signupController = async (req, res) => {
  const student = await authService.createStudent(req.validatedData);
  
  res.status(201).json({
    message: '회원가입이 완료되었습니다',
    student
  });
};

// POST /api/auth/signup - 회원가입
router.post('/signup', 
  validateInput(schemas.signup),
  handleServiceError(signupController)
);

/**
 * 로그인 컨트롤러 함수
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const loginController = async (req, res) => {
  const { email, password } = req.validatedData;
  
  // 인증 서비스 호출
  const student = await authService.authenticateStudent(email, password);
  
  // 세션 데이터 생성 및 저장
  req.session.student = authService.createSessionData(student);
  
  res.json({
    message: '로그인 성공',
    student: req.session.student
  });
};

// POST /api/auth/login - 로그인
router.post('/login',
  validateInput(schemas.login),
  handleServiceError(loginController)
);

/**
 * 로그아웃 컨트롤러 함수
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const logoutController = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('로그아웃 에러:', err);
      return res.status(500).json({ error: '로그아웃 처리 중 오류가 발생했습니다' });
    }
    
    res.clearCookie('connect.sid');
    res.json({ message: '로그아웃 되었습니다' });
  });
};

// POST /api/auth/logout - 로그아웃
router.post('/logout', logoutController);

/**
 * 현재 사용자 정보 조회 컨트롤러 함수
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getCurrentUserController = (req, res) => {
  res.json({ student: req.session.student });
};

// GET /api/auth/me - 현재 사용자 정보
router.get('/me', requireAuth, getCurrentUserController);

module.exports = router;