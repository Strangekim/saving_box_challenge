/**
 * 랭킹 & 챌린지 라우터 - 서비스와 미들웨어 조합 방식
 * 
 * 구조: 라우터 = 미들웨어 + 서비스 조합
 * 역할: HTTP 요청/응답 처리, 랭킹 서비스 레이어 호출
 * 기능: 학교/학과 랭킹, 챌린지 관리
 */

const express = require('express');
const rankingService = require('../services/rankingService');
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

// Mock 챌린지 데이터
const mockChallenges = new Map([
  [1, {
    id: 1,
    title: '일주일 연속 입금 챌린지',
    description: '7일 연속 1만원 이상 입금하기',
    reward: '신한포인트 5,000점',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-07'),
    participants: 45,
    isActive: true
  }],
  [2, {
    id: 2,
    title: '월말 목표 달성 챌린지',
    description: '이번 달 적금 목표의 80% 이상 달성하기',
    reward: '스타벅스 기프티콘',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    participants: 128,
    isActive: true
  }]
]);

// 사용자 챌린지 참여 기록
const userChallengeParticipation = new Map();

/**
 * 학교 랭킹 조회 컨트롤러
 */
const getSchoolRankingController = (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const ranking = rankingService.getSchoolRanking(limit);
  const userRankInfo = rankingService.getUserRankingInfo(
    req.session.student.name, 
    req.session.student.department
  );
  
  res.json({
    type: 'school',
    ranking,
    myRank: userRankInfo.schoolRank
  });
};

// GET /api/ranking/school - 학교 전체 랭킹
router.get('/school', requireAuth, getSchoolRankingController);

/**
 * 학과 랭킹 조회 컨트롤러
 */
const getDepartmentRankingController = (req, res) => {
  const department = req.session.student.department;
  const ranking = rankingService.getDepartmentRanking(department);
  const userRankInfo = rankingService.getUserRankingInfo(
    req.session.student.name,
    department
  );
  
  res.json({
    type: 'department',
    department,
    ranking,
    myRank: userRankInfo.departmentRank
  });
};

// GET /api/ranking/department - 학과 랭킹
router.get('/department', requireAuth, getDepartmentRankingController);

/**
 * 활성 챌린지 목록 조회 컨트롤러
 */
const getActiveChallengesController = (req, res) => {
  const challenges = rankingService.getActiveChallenges(req.session.student.email);
  res.json({ challenges });
};

// GET /api/ranking/challenges - 활성 챌린지 목록
router.get('/challenges', requireAuth, getActiveChallengesController);

/**
 * 챌린지 참여 컨트롤러
 */
const joinChallengeController = (req, res) => {
  const challengeId = parseInt(req.params.id);
  const result = rankingService.joinChallenge(challengeId, req.session.student.email);
  
  res.json({
    message: '챌린지 참여가 완료되었습니다',
    challenge: result.challenge
  });
};

// POST /api/ranking/challenges/:id/join - 챌린지 참여
router.post('/challenges/:id/join', 
  requireAuth,
  handleServiceError(joinChallengeController)
);

/**
 * 내 참여 챌린지 조회 컨트롤러
 */
const getMyChallengesController = (req, res) => {
  const myChallenges = rankingService.getUserChallenges(req.session.student.email);
  res.json({ myChallenges });
};

// GET /api/ranking/challenges/my - 내 참여 챌린지
router.get('/challenges/my', requireAuth, getMyChallengesController);

module.exports = router;