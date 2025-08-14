/**
 * 적금통 관련 검증 스키마
 * 
 * 적금통 생성, 입금 등 적금통 API의 입력값 검증 스키마 정의
 */

const Joi = require('joi');

const savingsSchemas = {
  createSavings: Joi.object({
    name: Joi.string().min(2).max(30).required(),
    targetAmount: Joi.number().min(10000).max(100000000).required(),
    targetDate: Joi.date().min('now').required(),
    autoTransferAmount: Joi.number().min(1000).optional(),
    autoTransferCycle: Joi.string().valid('daily', 'weekly', 'monthly').optional()
  }),
  
  deposit: Joi.object({
    amount: Joi.number().min(1000).max(10000000).required(),
    memo: Joi.string().max(100).optional()
  })
};

module.exports = savingsSchemas;