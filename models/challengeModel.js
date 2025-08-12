/**
 * 챌린지 모델 - DB 연동
 * 
 * 기능: 챌린지 CRUD, 참여 관리, 진행 상황 추적
 * 테이블: saving_challenge, user_challenge_participation (동적 관리)
 * 특징: PostgreSQL 기반 데이터 영속성
 */

const { pool } = require('../config/database');

/**
 * 모든 활성 챌린지 조회
 * 
 * @returns {Promise<Array>} 챌린지 목록
 */
const getAllChallenges = async () => {
  const query = `
    SELECT 
      id,
      title,
      description,
      saving_product_id,
      start_date,
      end_date,
      created_at,
      CASE 
        WHEN end_date >= CURRENT_DATE AND start_date <= CURRENT_DATE THEN true 
        ELSE false 
      END as is_active
    FROM saving_challenge
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

/**
 * 활성 챌린지만 조회
 * 
 * @returns {Promise<Array>} 활성 챌린지 목록
 */
const getActiveChallenges = async () => {
  const query = `
    SELECT 
      id,
      title,
      description,
      saving_product_id,
      start_date,
      end_date,
      created_at
    FROM saving_challenge
    WHERE end_date >= CURRENT_DATE AND start_date <= CURRENT_DATE
    ORDER BY end_date ASC
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

/**
 * 챌린지 ID로 조회
 * 
 * @param {number} challengeId - 챌린지 ID
 * @returns {Promise<Object|null>} 챌린지 정보
 */
const getChallengeById = async (challengeId) => {
  const query = `
    SELECT 
      id,
      title,
      description,
      saving_product_id,
      start_date,
      end_date,
      created_at,
      CASE 
        WHEN end_date >= CURRENT_DATE AND start_date <= CURRENT_DATE THEN true 
        ELSE false 
      END as is_active
    FROM saving_challenge
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [challengeId]);
  return result.rows[0] || null;
};

/**
 * 새 챌린지 생성
 * 
 * @param {Object} challengeData - 챌린지 데이터
 * @returns {Promise<Object>} 생성된 챌린지
 */
const createChallenge = async ({ title, description, saving_product_id, start_date, end_date }) => {
  const query = `
    INSERT INTO saving_challenge (title, description, saving_product_id, start_date, end_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const result = await pool.query(query, [title, description, saving_product_id, start_date, end_date]);
  return result.rows[0];
};

/**
 * 사용자가 특정 챌린지에 참여 중인지 확인
 * 동적 테이블 관리 방식 사용 (필요시 테이블 생성)
 * 
 * @param {number} userId - 사용자 ID
 * @param {number} challengeId - 챌린지 ID
 * @returns {Promise<boolean>} 참여 여부
 */
const isUserParticipating = async (userId, challengeId) => {
  // 임시 참여 테이블 생성 (존재하지 않는 경우)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_challenge_participation (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES "user"(id),
      challenge_id INT REFERENCES saving_challenge(id),
      joined_at TIMESTAMP DEFAULT NOW(),
      progress INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'participating',
      UNIQUE(user_id, challenge_id)
    )
  `);

  const query = `
    SELECT id FROM user_challenge_participation 
    WHERE user_id = $1 AND challenge_id = $2 AND status = 'participating'
  `;
  
  const result = await pool.query(query, [userId, challengeId]);
  return result.rows.length > 0;
};

/**
 * 챌린지 참여
 * 
 * @param {number} userId - 사용자 ID
 * @param {number} challengeId - 챌린지 ID
 * @returns {Promise<Object>} 참여 정보
 */
const joinChallenge = async (userId, challengeId) => {
  // 참여 테이블 확인/생성
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_challenge_participation (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES "user"(id),
      challenge_id INT REFERENCES saving_challenge(id),
      joined_at TIMESTAMP DEFAULT NOW(),
      progress INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'participating',
      UNIQUE(user_id, challenge_id)
    )
  `);

  const query = `
    INSERT INTO user_challenge_participation (user_id, challenge_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, challenge_id) 
    DO UPDATE SET status = 'participating', joined_at = NOW()
    RETURNING *
  `;
  
  const result = await pool.query(query, [userId, challengeId]);
  return result.rows[0];
};

/**
 * 사용자 참여 챌린지 목록 조회
 * 
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Array>} 참여 챌린지 목록
 */
const getUserChallenges = async (userId) => {
  // 참여 테이블 확인/생성
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_challenge_participation (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES "user"(id),
      challenge_id INT REFERENCES saving_challenge(id),
      joined_at TIMESTAMP DEFAULT NOW(),
      progress INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'participating',
      UNIQUE(user_id, challenge_id)
    )
  `);

  const query = `
    SELECT 
      sc.*,
      ucp.joined_at,
      ucp.progress,
      ucp.status as participation_status,
      CASE 
        WHEN sc.end_date >= CURRENT_DATE AND sc.start_date <= CURRENT_DATE THEN true 
        ELSE false 
      END as is_active
    FROM saving_challenge sc
    INNER JOIN user_challenge_participation ucp ON sc.id = ucp.challenge_id
    WHERE ucp.user_id = $1 AND ucp.status = 'participating'
    ORDER BY sc.end_date ASC
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
};

/**
 * 챌린지 진행률 업데이트
 * 
 * @param {number} userId - 사용자 ID
 * @param {number} challengeId - 챌린지 ID
 * @param {number} progress - 진행률 (0-100)
 * @returns {Promise<Object>} 업데이트된 참여 정보
 */
const updateChallengeProgress = async (userId, challengeId, progress) => {
  const query = `
    UPDATE user_challenge_participation 
    SET progress = $3
    WHERE user_id = $1 AND challenge_id = $2
    RETURNING *
  `;
  
  const result = await pool.query(query, [userId, challengeId, progress]);
  return result.rows[0];
};

/**
 * 챌린지 참여자 수 조회
 * 
 * @param {number} challengeId - 챌린지 ID
 * @returns {Promise<number>} 참여자 수
 */
const getChallengeParticipantCount = async (challengeId) => {
  // 참여 테이블 확인/생성
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_challenge_participation (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES "user"(id),
      challenge_id INT REFERENCES saving_challenge(id),
      joined_at TIMESTAMP DEFAULT NOW(),
      progress INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'participating',
      UNIQUE(user_id, challenge_id)
    )
  `);

  const query = `
    SELECT COUNT(*) as participant_count
    FROM user_challenge_participation 
    WHERE challenge_id = $1 AND status = 'participating'
  `;
  
  const result = await pool.query(query, [challengeId]);
  return parseInt(result.rows[0].participant_count);
};

module.exports = {
  getAllChallenges,
  getActiveChallenges,
  getChallengeById,
  createChallenge,
  isUserParticipating,
  joinChallenge,
  getUserChallenges,
  updateChallengeProgress,
  getChallengeParticipantCount
};