/**
 * 업적 모델 - DB 연동
 * 
 * 기능: 업적 CRUD, 사용자 업적 관리, 보상 처리
 * 테이블: achievement, user_achievement, achievement_reward
 * 특징: JSONB 기반 동적 조건 평가
 */

const { pool } = require('../config/database');

/**
 * 모든 업적 조회
 * 
 * @returns {Promise<Array>} 업적 목록
 */
const getAllAchievements = async () => {
  const query = `
    SELECT 
      id,
      code,
      title,
      description,
      condition,
      is_active,
      created_at
    FROM achievement
    WHERE is_active = true
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

/**
 * 업적 ID로 조회
 * 
 * @param {number} achievementId - 업적 ID
 * @returns {Promise<Object|null>} 업적 정보
 */
const getAchievementById = async (achievementId) => {
  const query = `
    SELECT 
      id,
      code,
      title,
      description,
      condition,
      is_active,
      created_at
    FROM achievement
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [achievementId]);
  return result.rows[0] || null;
};

/**
 * 업적 코드로 조회
 * 
 * @param {string} code - 업적 코드
 * @returns {Promise<Object|null>} 업적 정보
 */
const getAchievementByCode = async (code) => {
  const query = `
    SELECT 
      id,
      code,
      title,
      description,
      condition,
      is_active,
      created_at
    FROM achievement
    WHERE code = $1 AND is_active = true
  `;
  
  const result = await pool.query(query, [code]);
  return result.rows[0] || null;
};

/**
 * 새 업적 생성
 * 
 * @param {Object} achievementData - 업적 데이터
 * @returns {Promise<Object>} 생성된 업적
 */
const createAchievement = async ({ code, title, description, condition }) => {
  const query = `
    INSERT INTO achievement (code, title, description, condition)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const conditionJson = JSON.stringify(condition);
  const result = await pool.query(query, [code, title, description, conditionJson]);
  return result.rows[0];
};

/**
 * 사용자 업적 달성 기록
 * 
 * @param {number} userId - 사용자 ID
 * @param {number} achievementId - 업적 ID
 * @param {Object} meta - 추가 메타 데이터
 * @returns {Promise<Object>} 달성 기록
 */
const unlockUserAchievement = async (userId, achievementId, meta = {}) => {
  const query = `
    INSERT INTO user_achievement (user_id, achievement_id, meta)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING *
  `;
  
  const metaJson = JSON.stringify(meta);
  const result = await pool.query(query, [userId, achievementId, metaJson]);
  return result.rows[0];
};

/**
 * 사용자가 달성한 업적 목록 조회
 * 
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Array>} 달성한 업적 목록
 */
const getUserAchievements = async (userId) => {
  const query = `
    SELECT 
      a.id,
      a.code,
      a.title,
      a.description,
      a.condition,
      ua.unlocked_at,
      ua.meta
    FROM achievement a
    INNER JOIN user_achievement ua ON a.id = ua.achievement_id
    WHERE ua.user_id = $1 AND a.is_active = true
    ORDER BY ua.unlocked_at DESC
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
};

/**
 * 사용자가 특정 업적을 달성했는지 확인
 * 
 * @param {number} userId - 사용자 ID
 * @param {number} achievementId - 업적 ID
 * @returns {Promise<boolean>} 달성 여부
 */
const hasUserUnlockedAchievement = async (userId, achievementId) => {
  const query = `
    SELECT id FROM user_achievement 
    WHERE user_id = $1 AND achievement_id = $2
  `;
  
  const result = await pool.query(query, [userId, achievementId]);
  return result.rows.length > 0;
};

/**
 * 업적 보상 조회
 * 
 * @param {number} achievementId - 업적 ID
 * @returns {Promise<Array>} 보상 아이템 목록
 */
const getAchievementRewards = async (achievementId) => {
  const query = `
    SELECT 
      ci.id,
      ci.type,
      ci.name,
      ci.description,
      ci.asset_url,
      ci.rarity
    FROM achievement_reward ar
    INNER JOIN cosmetic_item ci ON ar.item_id = ci.id
    WHERE ar.achievement_id = $1
  `;
  
  const result = await pool.query(query, [achievementId]);
  return result.rows;
};

/**
 * 업적 보상 추가
 * 
 * @param {number} achievementId - 업적 ID
 * @param {number} itemId - 아이템 ID
 * @returns {Promise<Object>} 생성된 보상 연결
 */
const addAchievementReward = async (achievementId, itemId) => {
  const query = `
    INSERT INTO achievement_reward (achievement_id, item_id)
    VALUES ($1, $2)
    ON CONFLICT (achievement_id, item_id) DO NOTHING
    RETURNING *
  `;
  
  const result = await pool.query(query, [achievementId, itemId]);
  return result.rows[0];
};

/**
 * 사용자 통계 기반 업적 진행률 계산용 데이터 조회
 * 
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Object>} 사용자 통계
 */
const getUserStatsForAchievements = async (userId) => {
  const query = `
    SELECT 
      um.bucket_count,
      um.success_days,
      um.current_streak,
      um.challenge_success_count,
      -- 적금통 완료 개수 계산
      (SELECT COUNT(*) FROM saving_bucket WHERE user_id = $1 AND status = 'success') as completed_buckets,
      -- 총 적금 성공일 계산 (모든 적금통의 success_days 합)
      COALESCE((SELECT SUM(success_days) FROM saving_bucket WHERE user_id = $1), 0) as total_success_days
    FROM user_metrics um
    WHERE um.user_id = $1
    
    UNION ALL
    
    -- 사용자 메트릭이 없는 경우 기본값 반환
    SELECT 
      0 as bucket_count,
      0 as success_days,
      0 as current_streak,
      0 as challenge_success_count,
      0 as completed_buckets,
      0 as total_success_days
    WHERE NOT EXISTS (SELECT 1 FROM user_metrics WHERE user_id = $1)
    
    LIMIT 1
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0] || {
    bucket_count: 0,
    success_days: 0,
    current_streak: 0,
    challenge_success_count: 0,
    completed_buckets: 0,
    total_success_days: 0
  };
};

/**
 * 업적 진행률 통계가 포함된 모든 업적 조회 (특정 사용자 기준)
 * 
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Array>} 업적 목록과 진행률
 */
const getAllAchievementsWithProgress = async (userId) => {
  const query = `
    SELECT 
      a.id,
      a.code,
      a.title,
      a.description,
      a.condition,
      a.is_active,
      a.created_at,
      CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as is_unlocked,
      ua.unlocked_at,
      ua.meta
    FROM achievement a
    LEFT JOIN user_achievement ua ON a.id = ua.achievement_id AND ua.user_id = $1
    WHERE a.is_active = true
    ORDER BY 
      CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END DESC,
      a.created_at DESC
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
};

/**
 * 업적 업데이트
 * 
 * @param {number} achievementId - 업적 ID
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<Object>} 업데이트된 업적
 */
const updateAchievement = async (achievementId, updateData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updateData.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updateData.title);
  }
  
  if (updateData.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updateData.description);
  }
  
  if (updateData.condition !== undefined) {
    fields.push(`condition = $${paramIndex++}`);
    values.push(JSON.stringify(updateData.condition));
  }
  
  if (updateData.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(updateData.is_active);
  }

  if (fields.length === 0) {
    throw new Error('업데이트할 필드가 없습니다');
  }

  values.push(achievementId);
  
  const query = `
    UPDATE achievement 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  getAllAchievements,
  getAchievementById,
  getAchievementByCode,
  createAchievement,
  unlockUserAchievement,
  getUserAchievements,
  hasUserUnlockedAchievement,
  getAchievementRewards,
  addAchievementReward,
  getUserStatsForAchievements,
  getAllAchievementsWithProgress,
  updateAchievement
};