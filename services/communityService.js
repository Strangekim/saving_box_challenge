/**
 * 커뮤니티 서비스 - 함수형 프로그래밍 방식 (DB 연동)
 * 
 * 기능: 적금통 기반 커뮤니티, 좋아요/댓글 관리, 페이징, 기본 모더레이션
 * 아키텍처: 순수 함수 중심, 불변성 유지, 적금통 공유 중심 커뮤니티
 * 보안: 욕설 필터링, 개인정보 마스킹, 스팸 방지
 */

const savingsBucketModel = require('../models/savingsBucketModel');
const userModel = require('../models/userModel');
const { pool } = require('../config/database');

// 간단한 욕설 필터 리스트
const badWords = ['욕설1', '욕설2', '비방', '도배'];

/**
 * 욕설 필터링 함수 (순수 함수)
 * 
 * @param {string} text - 검사할 텍스트
 * @returns {boolean} 부적절한 내용 포함 여부
 */
const containsBadWords = (text) => {
  return badWords.some(word => text.toLowerCase().includes(word.toLowerCase()));
};

/**
 * 사용자 정보 마스킹 함수 (순수 함수)
 * 
 * @param {Object} user - 사용자 정보
 * @param {boolean} isAnonymous - 익명 여부
 * @returns {Object} 마스킹된 사용자 정보
 */
const maskUserInfo = (user, isAnonymous = false) => {
  if (isAnonymous) {
    return {
      name: '익명',
      university: '익명'
    };
  }
  
  return {
    name: user.nickname || user.name,
    university: user.university_name || '알 수 없음'
  };
};

/**
 * 페이징 계산 함수 (순수 함수)
 * 
 * @param {Array} data - 전체 데이터 배열
 * @param {number} page - 페이지 번호
 * @param {number} limit - 페이지당 항목 수
 * @returns {Object} 페이징 정보와 데이터
 */
const paginate = (data, page, limit) => {
  const offset = (page - 1) * limit;
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginatedData = data.slice(offset, offset + limit);

  return {
    data: paginatedData,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      hasNext: offset + limit < totalItems,
      hasPrev: page > 1
    }
  };
};

/**
 * 적금통 정렬 함수 (순수 함수)
 * 
 * @param {Array} buckets - 적금통 배열
 * @param {string} sortBy - 정렬 기준 ('created_at', 'like_count' 등)
 * @param {string} order - 정렬 순서 ('desc', 'asc')
 * @returns {Array} 정렬된 적금통 배열
 */
const sortPosts = (buckets, sortBy = 'created_at', order = 'desc') => {
  return [...buckets].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (sortBy === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (order === 'desc') {
      return bValue - aValue;
    }
    return aValue - bValue;
  });
};

/**
 * 적금통에 커뮤니티 정보 첨부 함수 (순수 함수)
 * 
 * @param {Object} bucket - 기본 적금통 정보
 * @param {number} likeCount - 좋아요 수
 * @param {number} commentCount - 댓글 수
 * @param {boolean} isLiked - 사용자 좋아요 여부
 * @returns {Object} 추가 정보가 포함된 적금통 객체
 */
const enrichPostData = (bucket, likeCount, commentCount, isLiked) => {
  return {
    ...bucket,
    likeCount: parseInt(likeCount || 0),
    commentCount: parseInt(commentCount || 0),
    isLiked: !!isLiked
  };
};

/**
 * 공개 적금통 목록 조회 함수 (커뮤니티 게시글)
 * 
 * @param {Object} options - 조회 옵션 { page, limit, sortBy, order }
 * @param {string} studentEmail - 현재 사용자 이메일
 * @returns {Promise<Object>} 페이징된 적금통 목록
 */
const getPosts = async ({ page = 1, limit = 10, sortBy = 'created_at', order = 'desc' }, studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  const currentUserId = user ? user.id : null;

  // 공개 적금통 조회 (커뮤니티 게시글)
  const query = `
    SELECT 
      sb.*,
      u.nickname,
      u.email,
      univ.name as university_name,
      -- 좋아요 수
      COALESCE(like_count.count, 0) as like_count,
      -- 댓글 수  
      COALESCE(comment_count.count, 0) as comment_count,
      -- 현재 사용자 좋아요 여부
      CASE WHEN user_like.id IS NOT NULL THEN true ELSE false END as is_liked
    FROM saving_bucket sb
    INNER JOIN "user" u ON sb.user_id = u.id
    LEFT JOIN university univ ON u.university_id = univ.id
    -- 좋아요 수 서브쿼리
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as count 
      FROM saving_bucket_like 
      GROUP BY bucket_id
    ) like_count ON sb.id = like_count.bucket_id
    -- 댓글 수 서브쿼리
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as count 
      FROM saving_bucket_comment 
      GROUP BY bucket_id
    ) comment_count ON sb.id = comment_count.bucket_id
    -- 현재 사용자 좋아요 여부
    LEFT JOIN saving_bucket_like user_like ON sb.id = user_like.bucket_id AND user_like.user_id = $1
    WHERE sb.is_public = true
    ORDER BY sb.${sortBy === 'like_count' ? 'like_count' : 'created_at'} ${order.toUpperCase()}
  `;

  const result = await pool.query(query, [currentUserId]);
  const buckets = result.rows.map(row => {
    const author = maskUserInfo(row, row.is_anonymous);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      targetAmount: row.target_amount,
      targetDate: row.target_date,
      successDays: row.success_days,
      totalDays: row.total_days,
      status: row.status,
      createdAt: row.created_at,
      author,
      likeCount: parseInt(row.like_count),
      commentCount: parseInt(row.comment_count),
      isLiked: row.is_liked
    };
  });

  // 페이징
  return paginate(buckets, page, limit);
};

/**
 * 특정 적금통 상세 조회 함수 (커뮤니티 게시글)
 * 
 * @param {number} bucketId - 적금통 ID
 * @param {string} studentEmail - 현재 사용자 이메일
 * @returns {Promise<Object|null>} 적금통 상세 정보 또는 null
 */
const getPostById = async (bucketId, studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  const currentUserId = user ? user.id : null;

  const query = `
    SELECT 
      sb.*,
      u.nickname,
      u.email,
      univ.name as university_name,
      -- 좋아요 수
      COALESCE(like_count.count, 0) as like_count,
      -- 댓글 수  
      COALESCE(comment_count.count, 0) as comment_count,
      -- 현재 사용자 좋아요 여부
      CASE WHEN user_like.id IS NOT NULL THEN true ELSE false END as is_liked
    FROM saving_bucket sb
    INNER JOIN "user" u ON sb.user_id = u.id
    LEFT JOIN university univ ON u.university_id = univ.id
    -- 좋아요 수 서브쿼리
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as count 
      FROM saving_bucket_like 
      GROUP BY bucket_id
    ) like_count ON sb.id = like_count.bucket_id
    -- 댓글 수 서브쿼리
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as count 
      FROM saving_bucket_comment 
      GROUP BY bucket_id
    ) comment_count ON sb.id = comment_count.bucket_id
    -- 현재 사용자 좋아요 여부
    LEFT JOIN saving_bucket_like user_like ON sb.id = user_like.bucket_id AND user_like.user_id = $1
    WHERE sb.id = $2 AND sb.is_public = true
  `;

  const result = await pool.query(query, [currentUserId, bucketId]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const author = maskUserInfo(row, row.is_anonymous);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetAmount: row.target_amount,
    targetDate: row.target_date,
    successDays: row.success_days,
    totalDays: row.total_days,
    status: row.status,
    createdAt: row.created_at,
    author,
    likeCount: parseInt(row.like_count),
    commentCount: parseInt(row.comment_count),
    isLiked: row.is_liked
  };
};

/**
 * 적금통 좋아요 토글 함수
 * 
 * @param {number} bucketId - 적금통 ID
 * @param {string} studentEmail - 사용자 이메일
 * @returns {Promise<Object>} 좋아요 상태 정보
 * @throws {Error} 존재하지 않는 적금통인 경우
 */
const togglePostLike = async (bucketId, studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다');
  }

  const bucket = await savingsBucketModel.getSavingsBucketById(bucketId);
  if (!bucket || !bucket.is_public) {
    throw new Error('게시글을 찾을 수 없습니다');
  }

  // 현재 좋아요 상태 확인
  const checkQuery = `
    SELECT id FROM saving_bucket_like 
    WHERE bucket_id = $1 AND user_id = $2
  `;
  const checkResult = await pool.query(checkQuery, [bucketId, user.id]);
  const isCurrentlyLiked = checkResult.rows.length > 0;

  if (isCurrentlyLiked) {
    // 좋아요 취소
    await pool.query(
      `DELETE FROM saving_bucket_like WHERE bucket_id = $1 AND user_id = $2`,
      [bucketId, user.id]
    );
  } else {
    // 좋아요 추가
    await pool.query(
      `INSERT INTO saving_bucket_like (bucket_id, user_id) VALUES ($1, $2)`,
      [bucketId, user.id]
    );
  }

  // 업데이트된 좋아요 수 조회
  const countQuery = `
    SELECT COUNT(*) as like_count 
    FROM saving_bucket_like 
    WHERE bucket_id = $1
  `;
  const countResult = await pool.query(countQuery, [bucketId]);
  const likeCount = parseInt(countResult.rows[0].like_count);

  return {
    isLiked: !isCurrentlyLiked,
    likeCount
  };
};

/**
 * 적금통 댓글 조회 함수
 * 
 * @param {number} bucketId - 적금통 ID
 * @returns {Promise<Array>} 댓글 목록 (시간순 정렬)
 * @throws {Error} 존재하지 않는 적금통인 경우
 */
const getCommentsByPostId = async (bucketId) => {
  const bucket = await savingsBucketModel.getSavingsBucketById(bucketId);
  if (!bucket || !bucket.is_public) {
    throw new Error('게시글을 찾을 수 없습니다');
  }

  const query = `
    SELECT 
      sbc.id,
      sbc.content,
      sbc.created_at,
      u.nickname,
      univ.name as university_name
    FROM saving_bucket_comment sbc
    INNER JOIN "user" u ON sbc.user_id = u.id
    LEFT JOIN university univ ON u.university_id = univ.id
    WHERE sbc.bucket_id = $1
    ORDER BY sbc.created_at ASC
  `;

  const result = await pool.query(query, [bucketId]);
  
  return result.rows.map(row => ({
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    author: {
      name: row.nickname,
      university: row.university_name || '알 수 없음'
    }
  }));
};

/**
 * 새 댓글 생성 함수
 * 
 * @param {number} bucketId - 적금통 ID
 * @param {Object} commentData - 댓글 데이터
 * @param {string} studentEmail - 작성자 이메일
 * @returns {Promise<Object>} 생성된 댓글 정보
 * @throws {Error} 존재하지 않는 적금통이거나 부적절한 내용 포함시
 */
const createComment = async (bucketId, { content }, studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다');
  }

  const bucket = await savingsBucketModel.getSavingsBucketById(bucketId);
  if (!bucket || !bucket.is_public) {
    throw new Error('게시글을 찾을 수 없습니다');
  }

  // 욕설 필터링
  if (containsBadWords(content)) {
    throw new Error('부적절한 내용이 포함되어 있습니다');
  }

  // 댓글 생성
  const query = `
    INSERT INTO saving_bucket_comment (bucket_id, user_id, content)
    VALUES ($1, $2, $3)
    RETURNING id, content, created_at
  `;

  const result = await pool.query(query, [bucketId, user.id, content]);
  const comment = result.rows[0];

  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.created_at,
    author: {
      name: user.nickname,
      university: user.university_name || '알 수 없음'
    }
  };
};

/**
 * 사용자가 작성한 공개 적금통 조회 함수
 * 
 * @param {string} userEmail - 사용자 이메일
 * @returns {Promise<Array>} 사용자 공개 적금통 목록
 */
const getPostsByUser = async (userEmail) => {
  const user = await userModel.findUserByEmail(userEmail);
  if (!user) {
    return [];
  }

  const query = `
    SELECT 
      sb.*,
      -- 좋아요 수
      COALESCE(like_count.count, 0) as like_count,
      -- 댓글 수  
      COALESCE(comment_count.count, 0) as comment_count
    FROM saving_bucket sb
    -- 좋아요 수 서브쿼리
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as count 
      FROM saving_bucket_like 
      GROUP BY bucket_id
    ) like_count ON sb.id = like_count.bucket_id
    -- 댓글 수 서브쿼리
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as count 
      FROM saving_bucket_comment 
      GROUP BY bucket_id
    ) comment_count ON sb.id = comment_count.bucket_id
    WHERE sb.user_id = $1 AND sb.is_public = true
    ORDER BY sb.created_at DESC
  `;

  const result = await pool.query(query, [user.id]);
  
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    targetAmount: row.target_amount,
    targetDate: row.target_date,
    successDays: row.success_days,
    totalDays: row.total_days,
    status: row.status,
    createdAt: row.created_at,
    likeCount: parseInt(row.like_count),
    commentCount: parseInt(row.comment_count)
  }));
};

/**
 * 인기 적금통 조회 함수 (좋아요 수 기준)
 * 
 * @param {number} limit - 조회할 적금통 수
 * @param {string} studentEmail - 현재 사용자 이메일
 * @returns {Promise<Array>} 인기 적금통 목록
 */
const getPopularPosts = async (limit = 5, studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  const currentUserId = user ? user.id : null;

  const query = `
    SELECT 
      sb.*,
      u.nickname,
      univ.name as university_name,
      -- 좋아요 수
      COALESCE(like_count.count, 0) as like_count,
      -- 댓글 수  
      COALESCE(comment_count.count, 0) as comment_count,
      -- 현재 사용자 좋아요 여부
      CASE WHEN user_like.id IS NOT NULL THEN true ELSE false END as is_liked
    FROM saving_bucket sb
    INNER JOIN "user" u ON sb.user_id = u.id
    LEFT JOIN university univ ON u.university_id = univ.id
    -- 좋아요 수 서브쿼리
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as count 
      FROM saving_bucket_like 
      GROUP BY bucket_id
    ) like_count ON sb.id = like_count.bucket_id
    -- 댓글 수 서브쿼리
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as count 
      FROM saving_bucket_comment 
      GROUP BY bucket_id
    ) comment_count ON sb.id = comment_count.bucket_id
    -- 현재 사용자 좋아요 여부
    LEFT JOIN saving_bucket_like user_like ON sb.id = user_like.bucket_id AND user_like.user_id = $1
    WHERE sb.is_public = true
    ORDER BY like_count.count DESC, sb.created_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [currentUserId, limit]);
  
  return result.rows.map(row => {
    const author = maskUserInfo(row, row.is_anonymous);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      targetAmount: row.target_amount,
      targetDate: row.target_date,
      successDays: row.success_days,
      totalDays: row.total_days,
      status: row.status,
      createdAt: row.created_at,
      author,
      likeCount: parseInt(row.like_count),
      commentCount: parseInt(row.comment_count),
      isLiked: row.is_liked
    };
  });
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
 * @param {Map} postsData - 게시글 데이터
 * @param {Map} likesData - 좋아요 데이터
 * @param {Map} commentsData - 댓글 데이터
 * @returns {void}
 */
const setMockData = (postsData, likesData, commentsData) => {
  console.log('DB 연동 모드에서는 setMockData가 동작하지 않습니다');
};

// 함수형 프로그래밍 방식으로 모듈 내보내기
module.exports = {
  // 순수 함수들
  containsBadWords,
  maskUserInfo,
  paginate,
  sortPosts,
  enrichPostData,

  // 게시글 관련 함수들 (적금통 기반)
  getPosts,
  getPostById,
  getPostsByUser,
  getPopularPosts,

  // 좋아요 관련 함수들
  togglePostLike,

  // 댓글 관련 함수들
  getCommentsByPostId,
  createComment,

  // 유틸리티 함수들
  clearMockData,
  setMockData
};