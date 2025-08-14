/**
 * 커뮤니티 관련 검증 스키마
 * 
 * 게시글, 댓글 등 커뮤니티 API의 입력값 검증 스키마 정의
 */

const Joi = require('joi');

const communitySchemas = {
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

module.exports = communitySchemas;