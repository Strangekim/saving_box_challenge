/**
 * 인증 관련 검증 스키마
 * 
 * 회원가입, 로그인 등 인증 API의 입력값 검증 스키마 정의
 */

const Joi = require('joi');

const authSchemas = {
  signup: Joi.object({
    email: Joi.string().email().pattern(/@[a-zA-Z]+\.ac\.kr$/).required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).max(20).required(),
    department: Joi.string().min(2).max(30).required(),
    studentId: Joi.string().pattern(/^\d{8,10}$/).required()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

module.exports = authSchemas;