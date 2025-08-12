/**
 * 사용자 모델 - DB 연동 함수형 프로그래밍 방식
 * 
 * 기능: 사용자 관련 DB 쿼리 함수들
 * 테이블: user, user_metrics, user_friend
 * 특징: 순수 함수 중심의 DB 인터페이스
 */

const { pool } = require('../config/database');

/**
 * 사용자 생성 함수
 * 
 * @param {Object} userData - 사용자 데이터
 * @returns {Promise<Object>} 생성된 사용자 정보
 */
const createUser = async ({ email, nickname, profileImage, universityId }) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 사용자 생성
    const userResult = await client.query(`
      INSERT INTO "user" (email, nickname, profile_image, university_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [email, nickname, profileImage, universityId]);
    
    const user = userResult.rows[0];
    
    // 사용자 메트릭스 초기화
    await client.query(`
      INSERT INTO user_metrics (user_id)
      VALUES ($1)
    `, [user.id]);
    
    await client.query('COMMIT');
    return user;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 이메일로 사용자 조회
 * 
 * @param {string} email - 사용자 이메일
 * @returns {Promise<Object|null>} 사용자 정보 또는 null
 */
const findUserByEmail = async (email) => {
  const result = await pool.query(`
    SELECT u.*, un.name as university_name, un.domain as university_domain
    FROM "user" u
    LEFT JOIN university un ON u.university_id = un.id
    WHERE u.email = $1
  `, [email]);
  
  return result.rows[0] || null;
};

/**
 * 사용자 ID로 조회
 * 
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Object|null>} 사용자 정보 또는 null
 */
const findUserById = async (userId) => {
  const result = await pool.query(`
    SELECT u.*, un.name as university_name, un.domain as university_domain
    FROM "user" u
    LEFT JOIN university un ON u.university_id = un.id
    WHERE u.id = $1
  `, [userId]);
  
  return result.rows[0] || null;
};

/**
 * 사용자 메트릭스 조회
 * 
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Object|null>} 메트릭스 정보 또는 null
 */
const getUserMetrics = async (userId) => {
  const result = await pool.query(`
    SELECT * FROM user_metrics WHERE user_id = $1
  `, [userId]);
  
  return result.rows[0] || null;
};

/**
 * 사용자 메트릭스 업데이트
 * 
 * @param {number} userId - 사용자 ID
 * @param {Object} metrics - 업데이트할 메트릭스
 * @returns {Promise<Object>} 업데이트된 메트릭스
 */
const updateUserMetrics = async (userId, metrics) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  Object.entries(metrics).forEach(([key, value]) => {
    fields.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });
  
  fields.push(`updated_at = NOW()`);
  values.push(userId);
  
  const result = await pool.query(`
    UPDATE user_metrics 
    SET ${fields.join(', ')}
    WHERE user_id = $${paramIndex}
    RETURNING *
  `, values);
  
  return result.rows[0];
};

/**
 * 친구 관계 생성
 * 
 * @param {number} userId - 사용자 ID
 * @param {number} friendId - 친구 ID
 * @returns {Promise<Object>} 생성된 친구 관계
 */
const createFriendship = async (userId, friendId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 양방향 친구 관계 생성
    await client.query(`
      INSERT INTO user_friend (user_id, friend_id)
      VALUES ($1, $2), ($2, $1)
      ON CONFLICT (user_id, friend_id) DO NOTHING
    `, [userId, friendId]);
    
    await client.query('COMMIT');
    
    const result = await client.query(`
      SELECT * FROM user_friend 
      WHERE user_id = $1 AND friend_id = $2
    `, [userId, friendId]);
    
    return result.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 사용자 친구 목록 조회
 * 
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Array>} 친구 목록
 */
const getUserFriends = async (userId) => {
  const result = await pool.query(`
    SELECT u.id, u.email, u.nickname, u.profile_image, uf.created_at as friend_since
    FROM user_friend uf
    JOIN "user" u ON uf.friend_id = u.id
    WHERE uf.user_id = $1
    ORDER BY uf.created_at DESC
  `, [userId]);
  
  return result.rows;
};

/**
 * 친구 관계 확인
 * 
 * @param {number} userId - 사용자 ID
 * @param {number} friendId - 친구 ID
 * @returns {Promise<boolean>} 친구 관계 여부
 */
const checkFriendship = async (userId, friendId) => {
  const result = await pool.query(`
    SELECT 1 FROM user_friend 
    WHERE user_id = $1 AND friend_id = $2
  `, [userId, friendId]);
  
  return result.rows.length > 0;
};

/**
 * 대학별 사용자 목록 조회
 * 
 * @param {number} universityId - 대학 ID
 * @param {number} limit - 조회 제한 수
 * @param {number} offset - 오프셋
 * @returns {Promise<Array>} 사용자 목록
 */
const getUsersByUniversity = async (universityId, limit = 20, offset = 0) => {
  const result = await pool.query(`
    SELECT u.*, um.bucket_count, um.success_days, um.current_streak
    FROM "user" u
    LEFT JOIN user_metrics um ON u.id = um.user_id
    WHERE u.university_id = $1
    ORDER BY um.success_days DESC NULLS LAST, u.created_at DESC
    LIMIT $2 OFFSET $3
  `, [universityId, limit, offset]);
  
  return result.rows;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getUserMetrics,
  updateUserMetrics,
  createFriendship,
  getUserFriends,
  checkFriendship,
  getUsersByUniversity
};