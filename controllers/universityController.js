/**
 * 대학 컨트롤러
 * 
 * 대학 관련 HTTP 요청 처리 로직
 * 서비스 레이어 호출 및 응답 생성
 */

const universityService = require('../services/universityService');

/**
 * 전체 대학 목록 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getAllUniversitiesController = async (req, res) => {
  const universities = await universityService.getAllUniversities();
  res.json({ universities });
};

/**
 * 대학별 랭킹 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
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

/**
 * 대학 통계 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getUniversityStatsController = async (req, res) => {
  const universityId = parseInt(req.params.id);
  const stats = await universityService.getUniversityStats(universityId);
  
  res.json({ stats });
};

/**
 * 내 대학 정보 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getMyUniversityController = async (req, res) => {
  const university = await universityService.getUniversityByEmail(req.session.student.email);
  
  if (!university) {
    return res.status(404).json({ error: '대학 정보를 찾을 수 없습니다' });
  }
  
  res.json({ university });
};

module.exports = {
  getAllUniversitiesController,
  getUniversityRankingController,
  getUniversityStatsController,
  getMyUniversityController
};