/**
 * 랭킹 & 챌린지 서비스 - 함수형 프로그래밍 방식 (DB 연동)
 * 
 * 기능: 학교/학과별 랭킹 계산, 챌린지 관리, 참여 현황 추적
 * 아키텍처: 순수 함수 중심, 불변성 유지, 실제 DB 연동
 * 계산: 적금 성공일, 연속 성공일, 적금통 개수 등으로 점수 산정
 */

const challengeModel = require('../models/challengeModel');
const userModel = require('../models/userModel');
const universityModel = require('../models/universityModel');

/**
 * 랭킹 순위 부여 함수 (순수 함수)
 * 
 * @param {Array} data - 랭킹 데이터 배열
 * @param {string} sortKey - 정렬 기준 키
 * @returns {Array} 순위가 부여된 데이터 배열
 */
const assignRanking = (data, sortKey = 'success_days') => {
  return [...data]
    .sort((a, b) => {
      const aValue = a[sortKey] || 0;
      const bValue = b[sortKey] || 0;
      
      if (bValue !== aValue) {
        return bValue - aValue; // 내림차순
      }
      
      // 동점일 경우 연속 성공일로 재정렬
      return (b.current_streak || 0) - (a.current_streak || 0);
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));
};

/**
 * 학과별 데이터 필터링 함수 (순수 함수)
 * 
 * @param {Array} data - 전체 데이터
 * @param {string} department - 필터링할 학과명
 * @returns {Array} 해당 학과 데이터만 포함된 배열
 */
const filterByDepartment = (data, department) => {
  return data.filter(item => item.department === department);
};

/**
 * 사용자 순위 찾기 함수 (순수 함수)
 * 
 * @param {Array} rankedData - 순위가 부여된 데이터
 * @param {string} userIdentifier - 사용자 식별자 (email 또는 name)
 * @param {string} identifierKey - 식별자 키 ('email' 또는 'name')
 * @returns {number|null} 사용자 순위 또는 null
 */
const findUserRank = (rankedData, userIdentifier, identifierKey = 'email') => {
  const userRank = rankedData.find(item => item[identifierKey] === userIdentifier);
  return userRank ? userRank.rank : null;
};

/**
 * 상위 N개 항목 추출 함수 (순수 함수)
 * 
 * @param {Array} data - 데이터 배열
 * @param {number} limit - 추출할 항목 수
 * @returns {Array} 상위 N개 항목
 */
const getTopN = (data, limit) => {
  return data.slice(0, limit);
};

/**
 * 챌린지 남은 일수 계산 함수 (순수 함수)
 * 
 * @param {Date} endDate - 종료 날짜
 * @param {Date} currentDate - 현재 날짜 (기본값: 현재 시간)
 * @returns {number} 남은 일수
 */
const calculateDaysRemaining = (endDate, currentDate = new Date()) => {
  const timeDiff = new Date(endDate).getTime() - currentDate.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};

/**
 * 활성 챌린지 필터링 함수 (순수 함수)
 * 
 * @param {Array} challenges - 챌린지 배열
 * @returns {Array} 활성 챌린지만 포함된 배열
 */
const filterActiveChallenges = (challenges) => {
  return challenges.filter(challenge => challenge.is_active);
};

/**
 * 대학 전체 랭킹 조회 함수
 * 
 * @param {number} universityId - 대학 ID
 * @param {number} limit - 조회할 상위 랭킹 수 (기본값: 20)
 * @returns {Promise<Array>} 대학 전체 랭킹 배열
 */
const getUniversityRanking = async (universityId, limit = 20) => {
  return await universityModel.getUniversityRanking(universityId, limit);
};

/**
 * 학과 랭킹 조회 함수 (Mock - 실제로는 학과 정보가 DB에 없음)
 * 
 * @param {string} department - 학과명
 * @returns {Promise<Array>} 해당 학과 랭킹 배열
 */
const getDepartmentRanking = async (department) => {
  // 현재 DB 스키마에는 학과 정보가 없으므로 빈 배열 반환
  // 향후 확장시 department 필드 추가 필요
  return [];
};

/**
 * 사용자 랭킹 정보 조회 함수
 * 
 * @param {string} studentEmail - 학생 이메일
 * @param {string} department - 학과명 (현재 사용하지 않음)
 * @returns {Promise<Object>} 사용자의 대학/학과 랭킹 정보
 */
const getUserRankingInfo = async (studentEmail, department = null) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    return { universityRank: null, departmentRank: null };
  }

  // 대학 랭킹에서 사용자 위치 찾기
  const universityRanking = await getUniversityRanking(user.university_id, 1000); // 충분히 큰 수로 전체 조회
  const rankedData = assignRanking(universityRanking);
  const universityRank = findUserRank(rankedData, studentEmail, 'email');

  return {
    universityRank,
    departmentRank: null // 현재 학과 기능 미지원
  };
};

/**
 * 활성 챌린지 목록 조회 함수
 * 
 * @param {string} studentEmail - 학생 이메일 (참여 현황 확인용)
 * @returns {Promise<Array>} 활성 챌린지 목록과 참여 현황
 */
const getActiveChallenges = async (studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    return [];
  }

  const challenges = await challengeModel.getActiveChallenges();
  
  const challengesWithParticipation = await Promise.all(
    challenges.map(async (challenge) => {
      const isParticipating = await challengeModel.isUserParticipating(user.id, challenge.id);
      const participantCount = await challengeModel.getChallengeParticipantCount(challenge.id);
      const daysRemaining = calculateDaysRemaining(challenge.end_date);

      return {
        ...challenge,
        participants: participantCount,
        isParticipating,
        daysRemaining,
        is_active: true
      };
    })
  );

  return challengesWithParticipation;
};

/**
 * 챌린지 참여 함수
 * 
 * @param {number} challengeId - 챌린지 ID
 * @param {string} studentEmail - 학생 이메일
 * @returns {Promise<Object>} 참여 결과 정보
 * @throws {Error} 존재하지 않거나 참여할 수 없는 챌린지인 경우
 */
const joinChallenge = async (challengeId, studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다');
  }

  const challenge = await challengeModel.getChallengeById(challengeId);
  if (!challenge) {
    throw new Error('챌린지를 찾을 수 없습니다');
  }

  if (!challenge.is_active) {
    throw new Error('참여할 수 없는 챌린지입니다');
  }

  const isAlreadyParticipating = await challengeModel.isUserParticipating(user.id, challengeId);
  if (isAlreadyParticipating) {
    throw new Error('이미 참여중인 챌린지입니다');
  }

  // 참여 처리
  const participation = await challengeModel.joinChallenge(user.id, challengeId);
  const updatedParticipantCount = await challengeModel.getChallengeParticipantCount(challengeId);

  return {
    challenge: {
      ...challenge,
      participants: updatedParticipantCount
    },
    participation,
    isParticipating: true
  };
};

/**
 * 사용자 참여 챌린지 조회 함수
 * 
 * @param {string} studentEmail - 학생 이메일
 * @returns {Promise<Array>} 참여중인 챌린지 목록
 */
const getUserChallenges = async (studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    return [];
  }

  const userChallenges = await challengeModel.getUserChallenges(user.id);
  
  return userChallenges.map(challenge => ({
    ...challenge,
    joinedAt: challenge.joined_at,
    isParticipating: true,
    daysRemaining: calculateDaysRemaining(challenge.end_date)
  }));
};

/**
 * 랭킹 데이터 업데이트 함수 (사용자 메트릭스 업데이트)
 * 
 * @param {string} studentEmail - 학생 이메일
 * @param {Object} metrics - 업데이트할 메트릭스
 * @returns {Promise<void>}
 */
const updateUserRanking = async (studentEmail, metrics) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (user) {
    await userModel.updateUserMetrics(user.id, metrics);
  }
};

/**
 * Mock 데이터 초기화 함수 (DB 연동에서는 불필요)
 * 
 * @returns {void}
 */
const clearMockData = () => {
  console.log('DB 연동 모드에서는 clearMockData가 동작하지 않습니다');
};

/**
 * Mock 데이터 설정 함수 (DB 연동에서는 불필요)
 * 
 * @param {Array} rankingData - 랭킹 데이터
 * @param {Map} challengeData - 챌린지 데이터
 * @param {Map} participationData - 참여 데이터
 * @returns {void}
 */
const setMockData = (rankingData, challengeData, participationData) => {
  console.log('DB 연동 모드에서는 setMockData가 동작하지 않습니다');
};

// 함수형 프로그래밍 방식으로 모듈 내보내기
module.exports = {
  // 순수 함수들
  assignRanking,
  filterByDepartment,
  findUserRank,
  getTopN,
  calculateDaysRemaining,
  filterActiveChallenges,

  // 데이터 조회 함수들
  getUniversityRanking,
  getDepartmentRanking,
  getUserRankingInfo,
  getActiveChallenges,
  getUserChallenges,

  // 데이터 조작 함수들 (사이드 이펙트 있음)
  joinChallenge,
  updateUserRanking,

  // 유틸리티 함수들
  clearMockData,
  setMockData
};