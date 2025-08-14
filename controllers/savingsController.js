/**
 * 적금통 컨트롤러
 * 
 * 적금통 관련 HTTP 요청 처리 로직
 * 서비스 레이어 호출 및 응답 생성
 */

const savingsService = require('../services/savingsService');

/**
 * 적금통 생성 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const createSavingsController = async (req, res) => {
  const savings = savingsService.createSavings(
    req.validatedData, 
    req.session.student.email
  );
  
  res.status(201).json({
    message: '적금통이 생성되었습니다',
    savings
  });
};

/**
 * 내 적금통 목록 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getSavingsListController = (req, res) => {
  const savings = savingsService.findSavingsByStudentEmail(req.session.student.email);
  res.json({ savings });
};

/**
 * 적금통 상세 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getSavingsDetailController = (req, res) => {
  const savings = savingsService.getSavingsWithTransactions(req.savingsId);
  
  if (!savings) {
    return res.status(404).json({ error: '적금통을 찾을 수 없습니다' });
  }
  
  res.json({ savings });
};

/**
 * 입금 처리 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const processDepositController = async (req, res) => {
  const { amount, memo } = req.validatedData;
  
  const result = savingsService.processDeposit(req.savingsId, amount, memo);
  
  const message = result.isGoalAchieved 
    ? '축하합니다! 목표 금액을 달성했습니다!' 
    : '입금이 완료되었습니다';
  
  res.json({
    message,
    savings: result.savings,
    transaction: result.transaction
  });
};

/**
 * 적금통 소유권 확인 미들웨어
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 */
const checkSavingsOwnership = (req, res, next) => {
  const savingsId = parseInt(req.params.id);
  const studentEmail = req.session.student.email;
  
  if (!savingsService.isSavingsOwner(savingsId, studentEmail)) {
    return res.status(403).json({ error: '접근 권한이 없습니다' });
  }
  
  req.savingsId = savingsId;
  next();
};

module.exports = {
  createSavingsController,
  getSavingsListController,
  getSavingsDetailController,
  processDepositController,
  checkSavingsOwnership
};