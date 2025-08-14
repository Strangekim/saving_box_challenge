/**
 * 공통 검증 미들웨어
 * 
 * 입력값 검증과 에러 처리를 위한 재사용 가능한 미들웨어 모음
 */

/**
 * 입력값 검증 미들웨어 생성 함수
 * 
 * @param {Object} schema - Joi 검증 스키마
 * @returns {Function} Express 미들웨어 함수
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
 * 에러 처리 미들웨어 생성 함수
 * 
 * @param {Function} serviceFunction - 서비스 함수
 * @returns {Function} Express 미들웨어 함수
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

module.exports = {
  validateInput,
  handleServiceError
};