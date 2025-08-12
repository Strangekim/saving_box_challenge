/**
 * 적금통 모델 - DB 연동 함수형 프로그래밍 방식
 * 
 * 기능: 적금통 관련 DB 쿼리 함수들
 * 테이블: saving_bucket, saving_bucket_progress, saving_bucket_like, saving_bucket_comment
 * 특징: 순수 함수 중심의 DB 인터페이스
 */

const { pool } = require('../config/database');

/**
 * 적금통 생성
 * 
 * @param {Object} bucketData - 적금통 데이터
 * @returns {Promise<Object>} 생성된 적금통 정보
 */
const createSavingsBucket = async (bucketData) => {
  const {
    userId, savingProductId, savingChallengeId, productType, name, description,
    targetAmount, targetDate, depositCycle, color, isPublic, isAnonymous,
    totalDays, characterItemId, backgroundItemId, outfitItemId, hatItemId
  } = bucketData;

  const result = await pool.query(`
    INSERT INTO saving_bucket (
      user_id, saving_product_id, saving_challenge_id, product_type, name, description,
      target_amount, target_date, deposit_cycle, color, is_public, is_anonymous,
      total_days, character_item_id, background_item_id, outfit_item_id, hat_item_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `, [
    userId, savingProductId, savingChallengeId, productType, name, description,
    targetAmount, targetDate, depositCycle, color, isPublic, isAnonymous,
    totalDays, characterItemId, backgroundItemId, outfitItemId, hatItemId
  ]);

  return result.rows[0];
};

/**
 * 사용자별 적금통 목록 조회
 * 
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Array>} 적금통 목록
 */
const getSavingsBucketsByUser = async (userId) => {
  const result = await pool.query(`
    SELECT 
      sb.*,
      sc.title as challenge_title,
      COALESCE(sb.target_amount, 0) as target_amount,
      COALESCE(
        (SELECT COUNT(*) FROM saving_bucket_progress sbp 
         WHERE sbp.bucket_id = sb.id AND sbp.status = 'success'), 0
      ) as current_amount_days,
      ROUND(
        CASE 
          WHEN sb.total_days > 0 THEN 
            (COALESCE(sb.success_days, 0)::FLOAT / sb.total_days) * 100 
          ELSE 0 
        END, 2
      ) as progress_rate
    FROM saving_bucket sb
    LEFT JOIN saving_challenge sc ON sb.saving_challenge_id = sc.id
    WHERE sb.user_id = $1
    ORDER BY sb.created_at DESC
  `, [userId]);

  return result.rows;
};

/**
 * 적금통 상세 조회
 * 
 * @param {number} bucketId - 적금통 ID
 * @returns {Promise<Object|null>} 적금통 상세 정보
 */
const getSavingsBucketById = async (bucketId) => {
  const result = await pool.query(`
    SELECT 
      sb.*,
      u.nickname as user_nickname,
      u.profile_image as user_profile_image,
      sc.title as challenge_title,
      sc.description as challenge_description,
      ci_char.name as character_name,
      ci_char.asset_url as character_asset_url,
      ci_bg.name as background_name,
      ci_bg.asset_url as background_asset_url,
      ci_outfit.name as outfit_name,
      ci_outfit.asset_url as outfit_asset_url,
      ci_hat.name as hat_name,
      ci_hat.asset_url as hat_asset_url
    FROM saving_bucket sb
    LEFT JOIN "user" u ON sb.user_id = u.id
    LEFT JOIN saving_challenge sc ON sb.saving_challenge_id = sc.id
    LEFT JOIN cosmetic_item ci_char ON sb.character_item_id = ci_char.id
    LEFT JOIN cosmetic_item ci_bg ON sb.background_item_id = ci_bg.id
    LEFT JOIN cosmetic_item ci_outfit ON sb.outfit_item_id = ci_outfit.id
    LEFT JOIN cosmetic_item ci_hat ON sb.hat_item_id = ci_hat.id
    WHERE sb.id = $1
  `, [bucketId]);

  return result.rows[0] || null;
};

/**
 * 적금통 진행 상황 기록
 * 
 * @param {number} bucketId - 적금통 ID
 * @param {number} userId - 사용자 ID
 * @param {Date} date - 날짜
 * @param {string} status - 상태 ('success' | 'failed')
 * @returns {Promise<Object>} 기록된 진행 상황
 */
const recordBucketProgress = async (bucketId, userId, date, status) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 진행 상황 기록
    const progressResult = await client.query(`
      INSERT INTO saving_bucket_progress (bucket_id, user_id, date, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (bucket_id, user_id, date) 
      DO UPDATE SET status = EXCLUDED.status
      RETURNING *
    `, [bucketId, userId, date, status]);
    
    // 적금통 통계 업데이트
    if (status === 'success') {
      await client.query(`
        UPDATE saving_bucket 
        SET success_days = success_days + 1,
            last_progress_date = $2
        WHERE id = $1
      `, [bucketId, date]);
    } else if (status === 'failed') {
      await client.query(`
        UPDATE saving_bucket 
        SET fail_days = fail_days + 1,
            last_progress_date = $2
        WHERE id = $1
      `, [bucketId, date]);
    }
    
    await client.query('COMMIT');
    return progressResult.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 적금통 진행 상황 조회
 * 
 * @param {number} bucketId - 적금통 ID
 * @param {number} limit - 조회 제한 수
 * @returns {Promise<Array>} 진행 상황 목록
 */
const getBucketProgress = async (bucketId, limit = 30) => {
  const result = await pool.query(`
    SELECT * FROM saving_bucket_progress 
    WHERE bucket_id = $1 
    ORDER BY date DESC 
    LIMIT $2
  `, [bucketId, limit]);

  return result.rows;
};

/**
 * 적금통 좋아요 토글
 * 
 * @param {number} bucketId - 적금통 ID
 * @param {number} userId - 사용자 ID
 * @returns {Promise<{isLiked: boolean, likeCount: number}>} 좋아요 상태
 */
const toggleBucketLike = async (bucketId, userId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 기존 좋아요 확인
    const existingLike = await client.query(`
      SELECT 1 FROM saving_bucket_like 
      WHERE bucket_id = $1 AND user_id = $2
    `, [bucketId, userId]);
    
    let isLiked;
    
    if (existingLike.rows.length > 0) {
      // 좋아요 취소
      await client.query(`
        DELETE FROM saving_bucket_like 
        WHERE bucket_id = $1 AND user_id = $2
      `, [bucketId, userId]);
      
      await client.query(`
        UPDATE saving_bucket 
        SET like_count = like_count - 1 
        WHERE id = $1
      `, [bucketId]);
      
      isLiked = false;
    } else {
      // 좋아요 추가
      await client.query(`
        INSERT INTO saving_bucket_like (bucket_id, user_id)
        VALUES ($1, $2)
      `, [bucketId, userId]);
      
      await client.query(`
        UPDATE saving_bucket 
        SET like_count = like_count + 1 
        WHERE id = $1
      `, [bucketId]);
      
      isLiked = true;
    }
    
    // 현재 좋아요 수 조회
    const likeCountResult = await client.query(`
      SELECT like_count FROM saving_bucket WHERE id = $1
    `, [bucketId]);
    
    await client.query('COMMIT');
    
    return {
      isLiked,
      likeCount: likeCountResult.rows[0].like_count
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 적금통 댓글 작성
 * 
 * @param {number} bucketId - 적금통 ID
 * @param {number} userId - 사용자 ID
 * @param {string} content - 댓글 내용
 * @returns {Promise<Object>} 생성된 댓글
 */
const createBucketComment = async (bucketId, userId, content) => {
  const result = await pool.query(`
    INSERT INTO saving_bucket_comment (bucket_id, user_id, content)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [bucketId, userId, content]);

  return result.rows[0];
};

/**
 * 적금통 댓글 목록 조회
 * 
 * @param {number} bucketId - 적금통 ID
 * @returns {Promise<Array>} 댓글 목록
 */
const getBucketComments = async (bucketId) => {
  const result = await pool.query(`
    SELECT 
      sbc.*,
      u.nickname,
      u.profile_image
    FROM saving_bucket_comment sbc
    JOIN "user" u ON sbc.user_id = u.id
    WHERE sbc.bucket_id = $1
    ORDER BY sbc.created_at ASC
  `, [bucketId]);

  return result.rows;
};

/**
 * 공개 적금통 목록 조회 (피드용)
 * 
 * @param {number} limit - 조회 제한 수
 * @param {number} offset - 오프셋
 * @param {string} sortBy - 정렬 기준 ('latest', 'popular', 'success_rate')
 * @returns {Promise<Array>} 공개 적금통 목록
 */
const getPublicSavingsBuckets = async (limit = 20, offset = 0, sortBy = 'latest') => {
  let orderClause;
  
  switch (sortBy) {
    case 'popular':
      orderClause = 'ORDER BY sb.like_count DESC, sb.view_count DESC';
      break;
    case 'success_rate':
      orderClause = `ORDER BY 
        CASE WHEN sb.total_days > 0 THEN sb.success_days::FLOAT / sb.total_days ELSE 0 END DESC`;
      break;
    default:
      orderClause = 'ORDER BY sb.created_at DESC';
  }
  
  const result = await pool.query(`
    SELECT 
      sb.*,
      u.nickname,
      u.profile_image,
      sc.title as challenge_title,
      ROUND(
        CASE 
          WHEN sb.total_days > 0 THEN 
            (sb.success_days::FLOAT / sb.total_days) * 100 
          ELSE 0 
        END, 2
      ) as success_rate
    FROM saving_bucket sb
    JOIN "user" u ON sb.user_id = u.id
    LEFT JOIN saving_challenge sc ON sb.saving_challenge_id = sc.id
    WHERE sb.is_public = TRUE
    ${orderClause}
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  return result.rows;
};

module.exports = {
  createSavingsBucket,
  getSavingsBucketsByUser,
  getSavingsBucketById,
  recordBucketProgress,
  getBucketProgress,
  toggleBucketLike,
  createBucketComment,
  getBucketComments,
  getPublicSavingsBuckets
};