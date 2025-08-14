/**
 * 대학 라우터
 * 
 * 역할: 라우트 정의 및 미들웨어 조합
 * 컨트롤러와 서비스는 별도 파일로 분리
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { handleServiceError } = require('../middleware/validation');
const universityController = require('../controllers/universityController');
const router = express.Router();

// GET /api/university - 전체 대학 목록
router.get('/', 
  universityController.getAllUniversitiesController
);

// GET /api/university/:id/ranking - 대학별 랭킹
router.get('/:id/ranking', 
  requireAuth,
  handleServiceError(universityController.getUniversityRankingController)
);

// GET /api/university/:id/stats - 대학 통계
router.get('/:id/stats',
  requireAuth,
  handleServiceError(universityController.getUniversityStatsController)
);

// GET /api/university/my - 내 대학 정보
router.get('/my',
  requireAuth,
  handleServiceError(universityController.getMyUniversityController)
);

module.exports = router;