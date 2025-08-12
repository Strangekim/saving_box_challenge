/**
 * 커뮤니티 라우터 - 서비스와 미들웨어 조합 방식
 * 
 * 구조: 라우터 = 미들웨어 + 서비스 조합
 * 역할: HTTP 요청/응답 처리, 커뮤니티 서비스 레이어 호출
 * 기능: 게시글/댓글 관리, 좋아요 시스템, 모더레이션
 */

const express = require('express');
const Joi = require('joi');
const communityService = require('../services/communityService');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// 입력값 검증 스키마
const schemas = {
  createPost: Joi.object({
    title: Joi.string().min(5).max(100).required(),
    content: Joi.string().min(10).max(500).required(),
    savingsId: Joi.number().integer().optional(),
    isAnonymous: Joi.boolean().default(false)
  }),
  
  createComment: Joi.object({
    content: Joi.string().min(2).max(200).required(),
    isAnonymous: Joi.boolean().default(false)
  })
};

/**
 * 입력값 검증 미들웨어
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    req.validatedData = value;
    next();
  };
};

/**
 * 에러 처리 미들웨어
 */
const handleServiceError = (serviceFunction) => {
  return async (req, res, next) => {
    try {
      await serviceFunction(req, res, next);
    } catch (error) {
      console.error('서비스 에러:', error);
      res.status(400).json({ error: error.message });
    }
  };
};

/**
 * 게시글 목록 조회 컨트롤러
 */
const getPostsController = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'createdAt';
  const order = req.query.order || 'desc';
  
  const result = communityService.getPosts(
    { page, limit, sortBy, order }, 
    req.session.student.email
  );
  
  res.json(result);
};

// GET /api/community/posts - 게시글 목록 조회
router.get('/posts', requireAuth, getPostsController);

/**
 * 게시글 생성 컨트롤러
 */
const createPostController = async (req, res) => {
  const post = communityService.createPost(req.validatedData, req.session.student);
  
  res.status(201).json({
    message: '게시글이 작성되었습니다',
    post
  });
};

// POST /api/community/posts - 새 게시글 작성
router.post('/posts', 
  requireAuth,
  validateInput(schemas.createPost),
  handleServiceError(createPostController)
);

/**
 * 게시글 좋아요 토글 컨트롤러
 */
const toggleLikeController = (req, res) => {
  const postId = parseInt(req.params.id);
  const result = communityService.togglePostLike(postId, req.session.student.email);
  
  const message = result.isLiked 
    ? '좋아요를 눌렀습니다' 
    : '좋아요를 취소했습니다';
  
  res.json({
    message,
    ...result
  });
};

// POST /api/community/posts/:id/like - 게시글 좋아요 토글
router.post('/posts/:id/like', 
  requireAuth,
  handleServiceError(toggleLikeController)
);

/**
 * 댓글 목록 조회 컨트롤러
 */
const getCommentsController = (req, res) => {
  const postId = parseInt(req.params.id);
  const comments = communityService.getCommentsByPostId(postId);
  res.json({ comments });
};

// GET /api/community/posts/:id/comments - 댓글 목록 조회
router.get('/posts/:id/comments', 
  requireAuth,
  handleServiceError(getCommentsController)
);

/**
 * 댓글 생성 컨트롤러
 */
const createCommentController = async (req, res) => {
  const postId = parseInt(req.params.id);
  const comment = communityService.createComment(
    postId, 
    req.validatedData, 
    req.session.student
  );
  
  res.status(201).json({
    message: '댓글이 작성되었습니다',
    comment
  });
};

// POST /api/community/posts/:id/comments - 댓글 생성
router.post('/posts/:id/comments', 
  requireAuth,
  validateInput(schemas.createComment),
  handleServiceError(createCommentController)
);

module.exports = router;