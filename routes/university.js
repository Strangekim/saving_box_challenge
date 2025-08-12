/**
 * 대학 라우터 - 서비스와 미들웨어 조합 방식
 * 
 * 구조: 라우터 = 미들웨어 + 서비스 조합
 * 역할: HTTP 요청/응답 처리, 대학 서비스 레이어 호출
 * 기능: 대학 목록, 대학별 랭킹, 통계 조회
 */

const express = require('express');
const universityService = require('../services/universityService');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

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
 * 전체 대학 목록 조회 컨트롤러
 */
const getAllUniversitiesController = async (req, res) => {
  const universities = await universityService.getAllUniversities();
  res.json({ universities });
};

// GET /api/university - 전체 대학 목록
router.get('/', getAllUniversitiesController);

/**
 * 대학별 랭킹 조회 컨트롤러
 */
const getUniversityRankingController = async (req, res) => {
  const universityId = parseInt(req.params.id);
  const limit = parseInt(req.query.limit) || 20;
  
  const ranking = await universityService.getUniversityRanking(universityId, limit);
  const stats = await universityService.getUniversityStats(universityId);
  
  res.json({
    ranking,
    stats
  });
};

// GET /api/university/:id/ranking - 대학별 랭킹
router.get('/:id/ranking', 
  requireAuth,
  handleServiceError(getUniversityRankingController)
);

/**
 * 대학 통계 조회 컨트롤러
 */
const getUniversityStatsController = async (req, res) => {
  const universityId = parseInt(req.params.id);
  const stats = await universityService.getUniversityStats(universityId);
  
  res.json({ stats });
};

// GET /api/university/:id/stats - 대학 통계
router.get('/:id/stats',
  requireAuth,
  handleServiceError(getUniversityStatsController)
);

/**
 * 내 대학 정보 조회 컨트롤러
 */
const getMyUniversityController = async (req, res) => {
  const university = await universityService.getUniversityByEmail(req.session.student.email);
  
  if (!university) {
    return res.status(404).json({ error: '대학 정보를 찾을 수 없습니다' });
  }
  
  res.json({ university });
};

// GET /api/university/my - 내 대학 정보
router.get('/my',
  requireAuth,
  handleServiceError(getMyUniversityController)
);

module.exports = router;