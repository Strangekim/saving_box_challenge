/**
 * 업적 시스템 라우터 - 서비스와 미들웨어 조합 방식
 * 
 * 구조: 라우터 = 미들웨어 + 서비스 조합
 * 역할: HTTP 요청/응답 처리, 업적 서비스 레이어 호출
 * 특징: 룰 엔진 기반 확장 가능한 업적 시스템
 */

const express = require('express');
const achievementService = require('../services/achievementService');
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
      res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
  };
};
const achievementRules = new Map([
  ['first_savings', {
    id: 'first_savings',
    title: '첫 적금통 개설',
    description: '첫 번째 적금통을 만들었습니다',
    category: 'starter',
    conditions: [
      { type: 'savings_count', operator: '>=', value: 1 }
    ],
    rewards: [
      { type: 'points', value: 1000 },
      { type: 'badge', value: 'first_saver' }
    ],
    isRepeatable: false
  }],
  
  ['deposit_streak_7', {
    id: 'deposit_streak_7',
    title: '일주일 연속 입금',
    description: '7일 연속으로 입금했습니다',
    category: 'consistency',
    conditions: [
      { type: 'consecutive_deposit_days', operator: '>=', value: 7 }
    ],
    rewards: [
      { type: 'points', value: 5000 },
      { type: 'title', value: '꾸준한 저축왕' }
    ],
    isRepeatable: true
  }],

  ['goal_achiever', {
    id: 'goal_achiever',
    title: '목표 달성자',
    description: '적금 목표를 달성했습니다',
    category: 'achievement',
    conditions: [
      { type: 'goal_completed_count', operator: '>=', value: 1 }
    ],
    rewards: [
      { type: 'points', value: 10000 },
      { type: 'badge', value: 'goal_achiever' }
    ],
    isRepeatable: true
  }],

  ['high_saver', {
    id: 'high_saver',
    title: '백만원 저축가',
    description: '총 저축액이 100만원을 돌파했습니다',
    category: 'milestone',
    conditions: [
      { type: 'total_savings', operator: '>=', value: 1000000 }
    ],
    rewards: [
      { type: 'points', value: 50000 },
      { type: 'badge', value: 'million_saver' },
      { type: 'title', value: '백만원 저축가' }
    ],
    isRepeatable: false
  }]
]);

// 사용자 업적 진행 상황 및 보상 기록
const userAchievements = new Map();
const userStats = new Map(); // 사용자 통계 데이터 (실제로는 DB에서 계산)

/**
 * 사용자 통계 계산 함수 (Mock)
 * 실제 환경에서는 적금통, 거래내역 등 DB 데이터로 계산
 * 
 * @param {string} studentEmail - 학생 이메일
 * @returns {Object} 사용자 통계 객체
 */
function calculateUserStats(studentEmail) {
  // Mock 통계 데이터 (실제로는 복잡한 DB 쿼리)
  return {
    savings_count: 2,
    total_savings: 750000,
    consecutive_deposit_days: 5,
    goal_completed_count: 0,
    total_deposits: 15
  };
}

/**
 * 룰 엔진: 조건 평가 함수
 * 주어진 조건과 사용자 통계를 비교하여 달성 여부 판단
 * 
 * @param {Object} condition - 평가할 조건 객체
 * @param {Object} stats - 사용자 통계 객체
 * @returns {boolean} 조건 달성 여부
 */
function evaluateCondition(condition, stats) {
  const { type, operator, value } = condition;
  const userValue = stats[type] || 0;

  switch (operator) {
    case '>=': return userValue >= value;
    case '>': return userValue > value;
    case '==': return userValue === value;
    case '<=': return userValue <= value;
    case '<': return userValue < value;
    default: return false;
  }
}

/**
 * 업적 달성 체크 및 보상 지급
 * 
 * @param {string} studentEmail - 학생 이메일
 * @returns {Array} 새로 달성한 업적 목록
 */
function checkAndRewardAchievements(studentEmail) {
  const stats = calculateUserStats(studentEmail);
  const userKey = studentEmail;
  const userAchievementRecord = userAchievements.get(userKey) || { completed: new Set(), rewards: [] };
  const newAchievements = [];

  for (const [ruleId, rule] of achievementRules.entries()) {
    // 반복 불가능한 업적이 이미 완료된 경우 스킵
    if (!rule.isRepeatable && userAchievementRecord.completed.has(ruleId)) {
      continue;
    }

    // 모든 조건이 만족되는지 확인
    const isAchieved = rule.conditions.every(condition => 
      evaluateCondition(condition, stats)
    );

    if (isAchieved) {
      // 업적 달성 기록
      userAchievementRecord.completed.add(ruleId);
      
      // 보상 지급
      rule.rewards.forEach(reward => {
        userAchievementRecord.rewards.push({
          achievementId: ruleId,
          ...reward,
          earnedAt: new Date()
        });
      });

      newAchievements.push({
        ...rule,
        completedAt: new Date()
      });
    }
  }

  userAchievements.set(userKey, userAchievementRecord);
  return newAchievements;
}

/**
 * 전체 업적 목록 조회 컨트롤러
 */
const getAllAchievementsController = (req, res) => {
  const result = achievementService.getAllAchievementsWithProgress(req.session.student.email);
  res.json(result);
};

// GET /api/achievement - 전체 업적 목록 조회
router.get('/', requireAuth, getAllAchievementsController);

/**
 * 내 달성 업적 목록 조회 컨트롤러
 */
const getMyAchievementsController = (req, res) => {
  const result = achievementService.getUserCompletedAchievements(req.session.student.email);
  res.json(result);
};

// GET /api/achievement/my - 내 달성 업적 목록
router.get('/my', requireAuth, getMyAchievementsController);

/**
 * 업적 달성 체크 컨트롤러
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

// POST /api/achievement/check - 업적 달성 여부 체크
router.post('/check', requireAuth, checkAchievementsController);

module.exports = router;