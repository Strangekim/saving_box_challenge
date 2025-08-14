/**
 * 업적 시스템 컨트롤러
 * 
 * 업적 관련 HTTP 요청 처리 로직
 * 서비스 레이어 호출 및 응답 생성
 */

const achievementService = require('../services/achievementService');

/**
 * 전체 업적 목록 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getAllAchievementsController = (req, res) => {
  const result = achievementService.getAllAchievementsWithProgress(req.session.student.email);
  res.json(result);
};

/**
 * 내 달성 업적 목록 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getMyAchievementsController = (req, res) => {
  const result = achievementService.getUserCompletedAchievements(req.session.student.email);
  res.json(result);
};

/**
 * 업적 달성 체크 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const checkAchievementsController = (req, res) => {
  const newAchievements = achievementService.checkAndRewardAchievements(req.session.student.email);
  
  if (newAchievements.length > 0) {
    res.json({
      message: `${newAchievements.length}개의 새로운 업적을 달성했습니다!`,
      newAchievements
    });
  } else {
    res.json({
      message: '새로운 업적이 없습니다',
      newAchievements: []
    });
  }
};

module.exports = {
  getAllAchievementsController,
  getMyAchievementsController,
  checkAchievementsController
};