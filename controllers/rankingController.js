/**
 * 랭킹 & 챌린지 컨트롤러
 * 
 * 랭킹 및 챌린지 관련 HTTP 요청 처리 로직
 * 서비스 레이어 호출 및 응답 생성
 */

const rankingService = require('../services/rankingService');

/**
 * 학교 랭킹 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
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

/**
 * 학과 랭킹 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
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

/**
 * 활성 챌린지 목록 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getActiveChallengesController = (req, res) => {
  const challenges = rankingService.getActiveChallenges(req.session.student.email);
  res.json({ challenges });
};

/**
 * 챌린지 참여 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const joinChallengeController = (req, res) => {
  const challengeId = parseInt(req.params.id);
  const result = rankingService.joinChallenge(challengeId, req.session.student.email);
  
  res.json({
    message: '챌린지 참여가 완료되었습니다',
    challenge: result.challenge
  });
};

/**
 * 내 참여 챌린지 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getMyChallengesController = (req, res) => {
  const myChallenges = rankingService.getUserChallenges(req.session.student.email);
  res.json({ myChallenges });
};

module.exports = {
  getSchoolRankingController,
  getDepartmentRankingController,
  getActiveChallengesController,
  joinChallengeController,
  getMyChallengesController
};