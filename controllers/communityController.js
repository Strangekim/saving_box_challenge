/**
 * 커뮤니티 컨트롤러
 * 
 * 커뮤니티 관련 HTTP 요청 처리 로직
 * 서비스 레이어 호출 및 응답 생성
 */

const communityService = require('../services/communityService');

/**
 * 게시글 목록 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
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

/**
 * 게시글 생성 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const createPostController = async (req, res) => {
  const post = communityService.createPost(req.validatedData, req.session.student);
  
  res.status(201).json({
    message: '게시글이 작성되었습니다',
    post
  });
};

/**
 * 게시글 좋아요 토글 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
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

/**
 * 댓글 목록 조회 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getCommentsController = (req, res) => {
  const postId = parseInt(req.params.id);
  const comments = communityService.getCommentsByPostId(postId);
  res.json({ comments });
};

/**
 * 댓글 생성 컨트롤러
 * 
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
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

module.exports = {
  getPostsController,
  createPostController,
  toggleLikeController,
  getCommentsController,
  createCommentController
};