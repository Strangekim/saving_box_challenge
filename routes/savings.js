/**
 * 적금통 라우터 - 서비스와 미들웨어 조합 방식
 * 
 * 구조: 라우터 = 미들웨어 + 서비스 조합
 * 역할: HTTP 요청/응답 처리, 적금통 서비스 레이어 호출
 * 검증: Joi 스키마 기반 입력값 검증
 */

const express = require('express');
const Joi = require('joi');
const savingsService = require('../services/savingsService');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// 입력값 검증 스키마
const schemas = {
  createSavings: Joi.object({
    name: Joi.string().min(2).max(30).required(),
    targetAmount: Joi.number().min(10000).max(100000000).required(),
    targetDate: Joi.date().min('now').required(),
    autoTransferAmount: Joi.number().min(1000).optional(),
    autoTransferCycle: Joi.string().valid('daily', 'weekly', 'monthly').optional()
  }),
  
  deposit: Joi.object({
    amount: Joi.number().min(1000).max(10000000).required(),
    memo: Joi.string().max(100).optional()
  })
};

/**
 * 입력값 검증 미들웨어
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
 * 적금통 생성 컨트롤러
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

// POST /api/savings - 새 적금통 생성
router.post('/', 
  requireAuth,
  validateInput(schemas.createSavings),
  handleServiceError(createSavingsController)
);

/**
 * 내 적금통 목록 조회 컨트롤러
 */
const getSavingsListController = (req, res) => {
  const savings = savingsService.findSavingsByStudentEmail(req.session.student.email);
  res.json({ savings });
};

// GET /api/savings - 내 적금통 목록 조회
router.get('/', requireAuth, getSavingsListController);

/**
 * 적금통 소유권 확인 미들웨어
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

/**
 * 적금통 상세 조회 컨트롤러
 */
const getSavingsDetailController = (req, res) => {
  const savings = savingsService.getSavingsWithTransactions(req.savingsId);
  
  if (!savings) {
    return res.status(404).json({ error: '적금통을 찾을 수 없습니다' });
  }
  
  res.json({ savings });
};

// GET /api/savings/:id - 특정 적금통 상세 조회
router.get('/:id', 
  requireAuth,
  checkSavingsOwnership,
  getSavingsDetailController
);

/**
 * 입금 처리 컨트롤러
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

// POST /api/savings/:id/deposit - 적금통 입금 (Mock)
router.post('/:id/deposit',
  requireAuth,
  checkSavingsOwnership,
  validateInput(schemas.deposit),
  handleServiceError(processDepositController)
);

module.exports = router;