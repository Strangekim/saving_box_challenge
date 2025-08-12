/**
 * 대학 서비스 - 함수형 프로그래밍 방식
 * 
 * 기능: 대학 정보 관리, 대학별 통계, 랭킹 계산
 * 아키텍처: 순수 함수 중심, 불변성 유지, DB 모델 연동
 * 특징: 대학 도메인 기반 사용자 식별 및 통계 제공
 */

const universityModel = require('../models/universityModel');
const userModel = require('../models/userModel');

/**
 * 전체 대학 목록 조회 함수
 * 
 * @returns {Promise<Array>} 대학 목록
 */
const getAllUniversities = async () => {
  return await universityModel.getAllUniversities();
};

/**
 * 대학 ID로 조회 함수
 * 
 * @param {number} universityId - 대학 ID
 * @returns {Promise<Object|null>} 대학 정보
 */
const getUniversityById = async (universityId) => {
  return await universityModel.getUniversityById(universityId);
};

/**
 * 이메일 도메인으로 대학 조회 함수
 * 
 * @param {string} email - 이메일 주소
 * @returns {Promise<Object|null>} 대학 정보
 */
const getUniversityByEmail = async (email) => {
  return await universityModel.getUniversityByEmail(email);
};

/**
 * 대학 통계 조회 함수
 * 
 * @param {number} universityId - 대학 ID
 * @returns {Promise<Object>} 대학 통계
 */
const getUniversityStats = async (universityId) => {
  const stats = await universityModel.getUniversityStats(universityId);
  
  return {
    ...stats,
    total_users: parseInt(stats.total_users || 0),
    total_buckets: parseInt(stats.total_buckets || 0),
    avg_success_days: parseFloat(stats.avg_success_days || 0).toFixed(1),
    max_success_days: parseInt(stats.max_success_days || 0),
    completed_buckets: parseInt(stats.completed_buckets || 0),
    completion_rate: stats.total_buckets > 0 
      ? ((stats.completed_buckets / stats.total_buckets) * 100).toFixed(1)
      : '0.0'
  };
};

/**
 * 대학 랭킹 조회 함수
 * 
 * @param {number} universityId - 대학 ID
 * @param {number} limit - 조회 제한 수
 * @returns {Promise<Array>} 랭킹 목록
 */
const getUniversityRanking = async (universityId, limit = 20) => {
  const ranking = await universityModel.getUniversityRanking(universityId, limit);
  
  return ranking.map(user => ({
    ...user,
    success_days: parseInt(user.success_days || 0),
    current_streak: parseInt(user.current_streak || 0),
    bucket_count: parseInt(user.bucket_count || 0),
    rank: parseInt(user.rank)
  }));
};

/**
 * 대학별 사용자 목록 조회 함수
 * 
 * @param {number} universityId - 대학 ID
 * @param {number} limit - 조회 제한 수
 * @param {number} offset - 오프셋
 * @returns {Promise<Array>} 사용자 목록
 */
const getUsersByUniversity = async (universityId, limit = 20, offset = 0) => {
  return await userModel.getUsersByUniversity(universityId, limit, offset);
};

/**
 * 새 대학 생성 함수
 * 
 * @param {Object} universityData - 대학 데이터
 * @returns {Promise<Object>} 생성된 대학 정보
 */
const createUniversity = async ({ name, domain }) => {
  return await universityModel.createUniversity({ name, domain });
};

/**
 * 대학 정보 업데이트 함수
 * 
 * @param {number} universityId - 대학 ID  
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<Object>} 업데이트된 대학 정보
 */
const updateUniversity = async (universityId, updateData) => {
  return await universityModel.updateUniversity(universityId, updateData);
};

/**
 * 대학 도메인 검증 함수 (순수 함수)
 * 
 * @param {string} domain - 도메인 주소
 * @returns {boolean} 대학 도메인 형식 여부
 */
const isValidUniversityDomain = (domain) => {
  const universityDomainPattern = /^[a-zA-Z0-9.-]+\.ac\.kr$/;
  return universityDomainPattern.test(domain);
};

/**
 * 이메일에서 도메인 추출 함수 (순수 함수)
 * 
 * @param {string} email - 이메일 주소
 * @returns {string|null} 도메인 또는 null
 */
const extractDomainFromEmail = (email) => {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : null;
};

/**
 * 대학 랭킹 계산 함수 (순수 함수)
 * 
 * @param {Array} users - 사용자 목록
 * @param {string} sortBy - 정렬 기준
 * @returns {Array} 순위가 매겨진 사용자 목록
 */
const calculateRanking = (users, sortBy = 'success_days') => {
  return [...users]
    .sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      
      if (bValue !== aValue) {
        return bValue - aValue; // 내림차순
      }
      
      // 동점일 경우 연속 성공일로 재정렬
      return (b.current_streak || 0) - (a.current_streak || 0);
    })
    .map((user, index) => ({
      ...user,
      rank: index + 1
    }));
};

/**
 * 대학 통계 계산 함수 (순수 함수)
 * 
 * @param {Array} buckets - 적금통 목록
 * @param {Array} users - 사용자 목록
 * @returns {Object} 계산된 통계
 */
const calculateUniversityStats = (buckets, users) => {
  const totalUsers = users.length;
  const totalBuckets = buckets.length;
  const completedBuckets = buckets.filter(bucket => bucket.status === 'success').length;
  
  const avgSuccessDays = users.reduce((sum, user) => {
    return sum + (user.success_days || 0);
  }, 0) / totalUsers || 0;
  
  const maxSuccessDays = Math.max(...users.map(user => user.success_days || 0), 0);
  
  return {
    totalUsers,
    totalBuckets,
    completedBuckets,
    avgSuccessDays: avgSuccessDays.toFixed(1),
    maxSuccessDays,
    completionRate: totalBuckets > 0 
      ? ((completedBuckets / totalBuckets) * 100).toFixed(1)
      : '0.0'
  };
};

module.exports = {
  // 데이터 조작 함수들
  getAllUniversities,
  getUniversityById,
  getUniversityByEmail,
  getUniversityStats,
  getUniversityRanking,
  getUsersByUniversity,
  createUniversity,
  updateUniversity,
  
  // 순수 함수들
  isValidUniversityDomain,
  extractDomainFromEmail,
  calculateRanking,
  calculateUniversityStats
};