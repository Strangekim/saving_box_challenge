/**
 * 인증 컨트롤러
 * 
 * 인증 관련 HTTP 요청 처리 로직
 * 서비스 레이어 호출 및 응답 생성
 */

const authService = require('../services/authService');

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

/**
 * 로그인 컨트롤러 함수
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const loginController = async (req, res) => {
  const { email, password } = req.validatedData;
  
  const student = await authService.authenticateStudent(email, password);
  
  req.session.student = authService.createSessionData(student);
  
  res.json({
    message: '로그인 성공',
    student: req.session.student
  });
};

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

/**
 * 현재 사용자 정보 조회 컨트롤러 함수
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getCurrentUserController = (req, res) => {
  res.json({ student: req.session.student });
};

module.exports = {
  signupController,
  loginController,
  logoutController,
  getCurrentUserController
};