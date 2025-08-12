/**
 * 대학 모델 - DB 연동 함수형 프로그래밍 방식
 * 
 * 기능: 대학 관련 DB 쿼리 함수들
 * 테이블: university
 * 특징: 순수 함수 중심의 DB 인터페이스
 */

const { pool } = require('../config/database');

/**
 * 대학 생성
 * 
 * @param {Object} universityData - 대학 데이터
 * @returns {Promise<Object>} 생성된 대학 정보
 */
const createUniversity = async ({ name, domain }) => {
  const result = await pool.query(`
    INSERT INTO university (name, domain)
    VALUES ($1, $2)
    RETURNING *
  `, [name, domain]);

  return result.rows[0];
};

/**
 * 모든 대학 목록 조회
 * 
 * @returns {Promise<Array>} 대학 목록
 */
const getAllUniversities = async () => {
  const result = await pool.query(`
    SELECT * FROM university 
    ORDER BY name
  `);

  return result.rows;
};

/**
 * 대학 ID로 조회
 * 
 * @param {number} universityId - 대학 ID
 * @returns {Promise<Object|null>} 대학 정보 또는 null
 */
const getUniversityById = async (universityId) => {
  const result = await pool.query(`
    SELECT * FROM university WHERE id = $1
  `, [universityId]);

  return result.rows[0] || null;
};

/**
 * 대학 도메인으로 조회
 * 
 * @param {string} domain - 대학 이메일 도메인
 * @returns {Promise<Object|null>} 대학 정보 또는 null
 */
const getUniversityByDomain = async (domain) => {
  const result = await pool.query(`
    SELECT * FROM university WHERE domain = $1
  `, [domain]);

  return result.rows[0] || null;
};

/**
 * 대학별 사용자 통계 조회
 * 
 * @param {number} universityId - 대학 ID
 * @returns {Promise<Object>} 대학 통계 정보
 */
const getUniversityStats = async (universityId) => {
  const result = await pool.query(`
    SELECT 
      COUNT(DISTINCT u.id) as total_users,
      COUNT(DISTINCT sb.id) as total_buckets,
      COALESCE(AVG(um.success_days), 0) as avg_success_days,
      COALESCE(MAX(um.success_days), 0) as max_success_days,
      COUNT(DISTINCT CASE WHEN sb.status = 'success' THEN sb.id END) as completed_buckets
    FROM "user" u
    LEFT JOIN user_metrics um ON u.id = um.user_id
    LEFT JOIN saving_bucket sb ON u.id = sb.user_id
    WHERE u.university_id = $1
  `, [universityId]);

  return result.rows[0];
};

/**
 * 대학별 랭킹 조회
 * 
 * @param {number} universityId - 대학 ID
 * @param {number} limit - 조회 제한 수
 * @returns {Promise<Array>} 대학 내 사용자 랭킹
 */
const getUniversityRanking = async (universityId, limit = 20) => {
  const result = await pool.query(`
    SELECT 
      u.id,
      u.nickname,
      u.profile_image,
      um.success_days,
      um.current_streak,
      um.bucket_count,
      ROW_NUMBER() OVER (ORDER BY um.success_days DESC, um.current_streak DESC) as rank
    FROM "user" u
    LEFT JOIN user_metrics um ON u.id = um.user_id
    WHERE u.university_id = $1
    ORDER BY um.success_days DESC, um.current_streak DESC
    LIMIT $2
  `, [universityId, limit]);

  return result.rows;
};

/**
 * 이메일에서 대학 도메인 추출하여 대학 정보 조회
 * 
 * @param {string} email - 이메일 주소
 * @returns {Promise<Object|null>} 대학 정보 또는 null
 */
const getUniversityByEmail = async (email) => {
  const domain = email.split('@')[1];
  if (!domain) return null;
  
  return await getUniversityByDomain(domain);
};

/**
 * 대학 정보 업데이트
 * 
 * @param {number} universityId - 대학 ID
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<Object>} 업데이트된 대학 정보
 */
const updateUniversity = async (universityId, updateData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.entries(updateData).forEach(([key, value]) => {
    fields.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });

  values.push(universityId);

  const result = await pool.query(`
    UPDATE university 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

  return result.rows[0];
};

module.exports = {
  createUniversity,
  getAllUniversities,
  getUniversityById,
  getUniversityByDomain,
  getUniversityStats,
  getUniversityRanking,
  getUniversityByEmail,
  updateUniversity
};