/**
 * 랭킹 & 챌린지 라우터
 * 
 * 역할: 라우트 정의 및 미들웨어 조합
 * 컨트롤러와 서비스는 별도 파일로 분리
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { handleServiceError } = require('../middleware/validation');
const rankingController = require('../controllers/rankingController');
const router = express.Router();

// GET /api/ranking/school - 학교 전체 랭킹
router.get('/school', 
  requireAuth, 
  rankingController.getSchoolRankingController
);

// GET /api/ranking/department - 학과 랭킹
router.get('/department', 
  requireAuth, 
  rankingController.getDepartmentRankingController
);

// GET /api/ranking/challenges - 활성 챌린지 목록
router.get('/challenges', 
  requireAuth, 
  rankingController.getActiveChallengesController
);

// POST /api/ranking/challenges/:id/join - 챌린지 참여
router.post('/challenges/:id/join', 
  requireAuth,
  handleServiceError(rankingController.joinChallengeController)
);

// GET /api/ranking/challenges/my - 내 참여 챌린지
router.get('/challenges/my', 
  requireAuth, 
  rankingController.getMyChallengesController
);

module.exports = router;