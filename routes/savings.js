/**
 * 적금통 라우터
 * 
 * 역할: 라우트 정의 및 미들웨어 조합
 * 컨트롤러와 서비스는 별도 파일로 분리
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateInput, handleServiceError } = require('../middleware/validation');
const savingsSchemas = require('../schemas/savingsSchemas');
const savingsController = require('../controllers/savingsController');
const router = express.Router();

// POST /api/savings - 새 적금통 생성
router.post('/', 
  requireAuth,
  validateInput(savingsSchemas.createSavings),
  handleServiceError(savingsController.createSavingsController)
);

// GET /api/savings - 내 적금통 목록 조회
router.get('/', requireAuth, savingsController.getSavingsListController);

// GET /api/savings/:id - 특정 적금통 상세 조회
router.get('/:id', 
  requireAuth,
  savingsController.checkSavingsOwnership,
  savingsController.getSavingsDetailController
);

// POST /api/savings/:id/deposit - 적금통 입금 (Mock)
router.post('/:id/deposit',
  requireAuth,
  savingsController.checkSavingsOwnership,
  validateInput(savingsSchemas.deposit),
  handleServiceError(savingsController.processDepositController)
);

module.exports = router;