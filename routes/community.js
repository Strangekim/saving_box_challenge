/**
 * 커뮤니티 라우터
 * 
 * 역할: 라우트 정의 및 미들웨어 조합
 * 컨트롤러와 서비스는 별도 파일로 분리
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateInput, handleServiceError } = require('../middleware/validation');
const communitySchemas = require('../schemas/communitySchemas');
const communityController = require('../controllers/communityController');
const router = express.Router();

// GET /api/community/posts - 게시글 목록 조회
router.get('/posts', requireAuth, communityController.getPostsController);

// POST /api/community/posts - 새 게시글 작성
router.post('/posts', 
  requireAuth,
  validateInput(communitySchemas.createPost),
  handleServiceError(communityController.createPostController)
);

// POST /api/community/posts/:id/like - 게시글 좋아요 토글
router.post('/posts/:id/like', 
  requireAuth,
  handleServiceError(communityController.toggleLikeController)
);

// GET /api/community/posts/:id/comments - 댓글 목록 조회
router.get('/posts/:id/comments', 
  requireAuth,
  handleServiceError(communityController.getCommentsController)
);

// POST /api/community/posts/:id/comments - 댓글 생성
router.post('/posts/:id/comments', 
  requireAuth,
  validateInput(communitySchemas.createComment),
  handleServiceError(communityController.createCommentController)
);

module.exports = router;