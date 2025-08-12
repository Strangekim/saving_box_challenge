/**
 * 업적 시스템 서비스 - 함수형 프로그래밍 방식 (룰 엔진 기반, DB 연동)
 * 
 * 기능: 업적 규칙 정의/관리, 조건 체크, 보상 지급, 진행률 추적
 * 아키텍처: 순수 함수 중심, 룰 엔진을 통한 확장 가능한 조건-보상 시스템
 * 특징: DB 연동, JSONB 기반 동적 평가 및 보상 처리
 */

const achievementModel = require('../models/achievementModel');
const userModel = require('../models/userModel');

/**
 * 조건 평가 함수 (순수 함수 - 룰 엔진 핵심)
 * 
 * @param {Object} condition - 평가할 조건 객체 { type, operator, value }
 * @param {Object} stats - 사용자 통계 객체
 * @returns {boolean} 조건 달성 여부
 */
const evaluateCondition = (condition, stats) => {
  const { type, operator, value } = condition;
  const userValue = stats[type] || 0;

  const operatorMap = {
    '>=': (a, b) => a >= b,
    '>': (a, b) => a > b,
    '==': (a, b) => a === b,
    '<=': (a, b) => a <= b,
    '<': (a, b) => a < b
  };

  const operatorFunction = operatorMap[operator];
  return operatorFunction ? operatorFunction(userValue, value) : false;
};

/**
 * 다중 조건 평가 함수 (순수 함수)
 * 
 * @param {Array} conditions - 조건 배열
 * @param {Object} stats - 사용자 통계 객체
 * @returns {boolean} 모든 조건 만족 여부
 */
const evaluateAllConditions = (conditions, stats) => {
  return conditions.every(condition => evaluateCondition(condition, stats));
};

/**
 * 업적 진행률 계산 함수 (순수 함수)
 * 
 * @param {Object} condition - 주요 조건 (첫 번째 조건)
 * @param {Object} stats - 사용자 통계 객체
 * @returns {Object} 진행률 정보 { progress, currentValue, targetValue }
 */
const calculateAchievementProgress = (condition, stats) => {
  const { type, value: targetValue } = condition;
  const currentValue = stats[type] || 0;
  const progress = Math.min(100, Math.round((currentValue / targetValue) * 100));

  return {
    progress,
    currentValue,
    targetValue
  };
};

/**
 * 보상 객체 생성 함수 (순수 함수)
 * 
 * @param {string} achievementId - 업적 ID
 * @param {Object} reward - 보상 정보
 * @returns {Object} 타임스탬프가 추가된 보상 객체
 */
const createReward = (achievementId, reward) => {
  return {
    achievementId,
    ...reward,
    earnedAt: new Date()
  };
};

/**
 * 사용자 통계 계산 함수 (DB 연동)
 * 
 * @param {string} studentEmail - 학생 이메일
 * @returns {Promise<Object>} 계산된 사용자 통계
 */
const calculateUserStats = async (studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    return {
      bucket_count: 0,
      success_days: 0,
      current_streak: 0,
      challenge_success_count: 0,
      completed_buckets: 0,
      total_success_days: 0
    };
  }

  return await achievementModel.getUserStatsForAchievements(user.id);
};

/**
 * 업적 달성 여부 확인 함수
 * 
 * @param {Object} achievement - 업적 객체
 * @param {Object} stats - 사용자 통계
 * @returns {boolean} 달성 여부
 */
const isAchievementEligible = (achievement, stats) => {
  if (!achievement || !achievement.condition) return false;
  
  const conditions = Array.isArray(achievement.condition) 
    ? achievement.condition 
    : [achievement.condition];

  return evaluateAllConditions(conditions, stats);
};

/**
 * 업적 달성 처리 및 보상 지급 함수
 * 
 * @param {string} studentEmail - 학생 이메일
 * @returns {Promise<Array>} 새로 달성한 업적 목록
 */
const checkAndRewardAchievements = async (studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    return [];
  }

  const stats = await calculateUserStats(studentEmail);
  const allAchievements = await achievementModel.getAllAchievements();
  const newAchievements = [];

  for (const achievement of allAchievements) {
    // 이미 달성한 업적인지 확인
    const alreadyUnlocked = await achievementModel.hasUserUnlockedAchievement(user.id, achievement.id);
    if (alreadyUnlocked) {
      continue;
    }

    // 업적 달성 조건 확인
    if (isAchievementEligible(achievement, stats)) {
      // 업적 달성 기록
      const unlockRecord = await achievementModel.unlockUserAchievement(
        user.id, 
        achievement.id, 
        { stats, unlockedAt: new Date() }
      );

      if (unlockRecord) {
        // 보상 조회
        const rewards = await achievementModel.getAchievementRewards(achievement.id);

        // 새 업적 목록에 추가
        newAchievements.push({
          ...achievement,
          completedAt: unlockRecord.unlocked_at,
          rewards
        });
      }
    }
  }

  return newAchievements;
};

/**
 * 모든 업적 목록과 진행률 조회 함수
 * 
 * @param {string} studentEmail - 학생 이메일
 * @returns {Promise<Object>} 업적 목록과 통계 정보
 */
const getAllAchievementsWithProgress = async (studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    return {
      achievements: [],
      totalCompleted: 0,
      totalAchievements: 0,
      stats: {}
    };
  }

  const stats = await calculateUserStats(studentEmail);
  const achievementsWithProgress = await achievementModel.getAllAchievementsWithProgress(user.id);

  const achievements = achievementsWithProgress.map(achievement => {
    let progressInfo = { progress: 0, currentValue: 0, targetValue: 0 };
    
    if (achievement.condition) {
      const conditions = Array.isArray(achievement.condition) 
        ? achievement.condition 
        : [achievement.condition];
      
      if (conditions.length > 0) {
        progressInfo = calculateAchievementProgress(conditions[0], stats);
      }
    }

    return {
      ...achievement,
      isCompleted: achievement.is_unlocked,
      ...progressInfo
    };
  });

  const totalCompleted = achievements.filter(a => a.isCompleted).length;

  return {
    achievements,
    totalCompleted,
    totalAchievements: achievements.length,
    stats
  };
};

/**
 * 사용자가 달성한 업적 목록 조회 함수
 * 
 * @param {string} studentEmail - 학생 이메일
 * @returns {Promise<Object>} 달성한 업적과 보상 정보
 */
const getUserCompletedAchievements = async (studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    return {
      completedAchievements: [],
      totalRewards: [],
      totalPoints: 0,
      badges: [],
      titles: []
    };
  }

  const completedAchievements = await achievementModel.getUserAchievements(user.id);
  
  // 각 업적의 보상 조회
  const achievementsWithRewards = await Promise.all(
    completedAchievements.map(async (achievement) => {
      const rewards = await achievementModel.getAchievementRewards(achievement.id);
      return {
        ...achievement,
        rewards
      };
    })
  );

  // 모든 보상을 평면화
  const allRewards = achievementsWithRewards.reduce((acc, achievement) => {
    return acc.concat(achievement.rewards || []);
  }, []);

  // 카테고리별 분류 (임시 - 실제로는 cosmetic_item 타입 기반)
  const badges = allRewards.filter(reward => reward.type === 'character');
  const titles = allRewards.filter(reward => reward.type === 'background');

  return {
    completedAchievements: achievementsWithRewards,
    totalRewards: allRewards,
    totalPoints: 0, // 현재 포인트 시스템 없음
    badges,
    titles
  };
};

/**
 * 새로운 업적 룰 추가 함수 (확장성)
 * 
 * @param {Object} rule - 업적 룰 객체
 * @returns {Promise<boolean>} 추가 성공 여부
 */
const addAchievementRule = async (rule) => {
  if (!rule.code || !rule.title) {
    return false;
  }

  try {
    const existingAchievement = await achievementModel.getAchievementByCode(rule.code);
    if (existingAchievement) {
      return false; // 이미 존재하는 코드
    }

    const validatedRule = {
      code: rule.code,
      title: rule.title || '제목 없음',
      description: rule.description || '설명 없음',
      condition: rule.conditions || rule.condition || []
    };

    await achievementModel.createAchievement(validatedRule);
    return true;
  } catch (error) {
    console.error('업적 룰 추가 실패:', error);
    return false;
  }
};

/**
 * 사용자 통계 업데이트 함수 (외부 서비스 연동용)
 * 
 * @param {string} studentEmail - 학생 이메일
 * @param {Object} newStats - 새로운 통계 데이터
 * @returns {Promise<void>}
 */
const updateUserStats = async (studentEmail, newStats) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (user) {
    await userModel.updateUserMetrics(user.id, newStats);
  }
};

/**
 * 특정 업적 달성 강제 처리 (테스트/관리자용)
 * 
 * @param {string} studentEmail - 학생 이메일
 * @param {string} achievementCode - 업적 코드
 * @returns {Promise<Object|null>} 달성된 업적 정보
 */
const forceUnlockAchievement = async (studentEmail, achievementCode) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    return null;
  }

  const achievement = await achievementModel.getAchievementByCode(achievementCode);
  if (!achievement) {
    return null;
  }

  const alreadyUnlocked = await achievementModel.hasUserUnlockedAchievement(user.id, achievement.id);
  if (alreadyUnlocked) {
    return null;
  }

  const unlockRecord = await achievementModel.unlockUserAchievement(
    user.id, 
    achievement.id, 
    { forcedUnlock: true, unlockedAt: new Date() }
  );

  if (unlockRecord) {
    const rewards = await achievementModel.getAchievementRewards(achievement.id);
    return {
      ...achievement,
      completedAt: unlockRecord.unlocked_at,
      rewards
    };
  }

  return null;
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
 * @param {Map} achievementData - 업적 데이터
 * @param {Map} statsData - 통계 데이터
 * @returns {void}
 */
const setMockData = (achievementData, statsData) => {
  console.log('DB 연동 모드에서는 setMockData가 동작하지 않습니다');
};

// 함수형 프로그래밍 방식으로 모듈 내보내기
module.exports = {
  // 순수 함수들 (룰 엔진 핵심)
  evaluateCondition,
  evaluateAllConditions,
  calculateAchievementProgress,
  createReward,
  isAchievementEligible,

  // 비즈니스 로직 함수들
  calculateUserStats,
  checkAndRewardAchievements,
  getAllAchievementsWithProgress,
  getUserCompletedAchievements,

  // 데이터 조작 함수들 (사이드 이펙트 있음)
  addAchievementRule,
  updateUserStats,
  forceUnlockAchievement,

  // 유틸리티 함수들
  clearMockData,
  setMockData
};