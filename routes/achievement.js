/**
 * 업적 시스템 라우터
 * 
 * 역할: 라우트 정의 및 미들웨어 조합
 * 컨트롤러와 서비스는 별도 파일로 분리
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const achievementController = require('../controllers/achievementController');
const router = express.Router();

// GET /api/achievement - 전체 업적 목록 조회
router.get('/', 
    requireAuth, 
    achievementController.getAllAchievementsController
);

// GET /api/achievement/my - 내 달성 업적 목록
router.get('/my', 
    requireAuth, 
    achievementController.getMyAchievementsController
);

// POST /api/achievement/check - 업적 달성 여부 체크
router.post('/check', 
    requireAuth, 
    achievementController.checkAchievementsController
);

module.exports = router;