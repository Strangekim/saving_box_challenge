/**
 * 인증 서비스 - 함수형 프로그래밍 방식
 * 
 * 기능: 학생 회원가입, 로그인 검증, 사용자 관리 등의 비즈니스 로직
 * 아키텍처: 순수 함수 중심, 불변성 유지, 사이드 이펙트 분리
 * 데이터: Mock 데이터 사용 (실제 환경에서는 DB 연동)
 */

const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const universityModel = require('../models/universityModel');

/**
 * 학교 이메일 패턴 검증 함수
 * 
 * @param {string} email - 검증할 이메일 주소
 * @returns {boolean} 학교 이메일 형식 여부
 */
const isValidUniversityEmail = (email) => {
  const universityEmailPattern = /@[a-zA-Z]+\.ac\.kr$/;
  return universityEmailPattern.test(email);
};

/**
 * 비밀번호 해싱 함수
 * 
 * @param {string} plainPassword - 평문 비밀번호
 * @returns {Promise<string>} 해시된 비밀번호
 */
const hashPassword = async (plainPassword) => {
  const saltRounds = 10;
  return await bcrypt.hash(plainPassword, saltRounds);
};

/**
 * 비밀번호 검증 함수
 * 
 * @param {string} plainPassword - 평문 비밀번호
 * @param {string} hashedPassword - 해시된 비밀번호
 * @returns {Promise<boolean>} 비밀번호 일치 여부
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * 학생 정보 마스킹 함수 (보안용)
 * 
 * @param {Object} student - 학생 정보 객체
 * @returns {Object} 민감정보가 제거된 학생 정보
 */
const maskStudentInfo = (student) => {
  const { password, ...safeStudentInfo } = student;
  return safeStudentInfo;
};

/**
 * 이메일 중복 확인 함수
 * 
 * @param {string} email - 확인할 이메일
 * @returns {Promise<boolean>} 중복 여부
 */
const isEmailExists = async (email) => {
  const user = await userModel.findUserByEmail(email);
  return !!user;
};

/**
 * 학생 정보 조회 함수
 * 
 * @param {string} email - 조회할 학생 이메일
 * @returns {Promise<Object|null>} 학생 정보 또는 null
 */
const findStudentByEmail = async (email) => {
  return await userModel.findUserByEmail(email);
};

/**
 * 새 학생 생성 함수
 * 
 * @param {Object} studentData - 학생 데이터
 * @returns {Promise<Object>} 생성된 학생 정보 (비밀번호 제외)
 * @throws {Error} 이미 존재하는 이메일인 경우
 */
const createStudent = async ({ email, password, name, department, studentId }) => {
  // 중복 확인
  if (await isEmailExists(email)) {
    throw new Error('이미 가입된 이메일입니다');
  }

  // 학교 이메일 검증
  if (!isValidUniversityEmail(email)) {
    throw new Error('유효한 학교 이메일 주소가 아닙니다');
  }

  // 대학 정보 조회 또는 생성
  let university = await universityModel.getUniversityByEmail(email);
  if (!university) {
    const domain = email.split('@')[1];
    const universityName = domain.split('.')[0] + '대학교'; // 간단한 대학명 생성
    university = await universityModel.createUniversity({
      name: universityName,
      domain: domain
    });
  }

  // 비밀번호 해싱
  const hashedPassword = await hashPassword(password);

  // 사용자 생성 (DB에는 nickname으로 저장)
  const user = await userModel.createUser({
    email,
    nickname: name, // name을 nickname으로 사용
    profileImage: null,
    universityId: university.id
  });

  // 비밀번호는 별도 저장 (예시용 - 실제로는 인증 서비스 사용 권장)
  // 임시로 메모리에 저장
  global.userPasswords = global.userPasswords || new Map();
  global.userPasswords.set(email, hashedPassword);

  // 안전한 정보만 반환
  return {
    email: user.email,
    name: user.nickname,
    department: department, // 임시로 파라미터로 받은 값 사용
    studentId: studentId,
    universityName: university.name
  };
};

/**
 * 로그인 검증 함수
 * 
 * @param {string} email - 로그인할 이메일
 * @param {string} password - 비밀번호
 * @returns {Promise<Object>} 인증된 학생 정보
 * @throws {Error} 인증 실패시
 */
const authenticateStudent = async (email, password) => {
  // 학생 정보 조회
  const student = await findStudentByEmail(email);
  if (!student) {
    throw new Error('이메일 또는 비밀번호가 잘못되었습니다');
  }

  // 비밀번호 검증 (임시 저장소에서 조회)
  global.userPasswords = global.userPasswords || new Map();
  const hashedPassword = global.userPasswords.get(email);
  
  if (!hashedPassword) {
    throw new Error('이메일 또는 비밀번호가 잘못되었습니다');
  }

  const isPasswordValid = await verifyPassword(password, hashedPassword);
  if (!isPasswordValid) {
    throw new Error('이메일 또는 비밀번호가 잘못되엁습니다');
  }

  // 안전한 정보만 반환
  return {
    email: student.email,
    name: student.nickname,
    department: 'Mock Department', // 임시 값
    studentId: 'Mock ID', // 임시 값
    universityName: student.university_name
  };
};

/**
 * 세션용 학생 정보 생성 함수
 * 
 * @param {Object} student - 학생 정보
 * @returns {Object} 세션에 저장할 학생 정보
 */
const createSessionData = (student) => {
  return {
    email: student.email,
    name: student.name,
    department: student.department,
    studentId: student.studentId
  };
};

/**
 * 모든 학생 정보 조회 (관리자용)
 * 
 * @returns {Promise<Array>} 모든 학생 정보 (비밀번호 제외)
 */
const getAllStudents = async () => {
  // 실제 DB에서는 사용자 목록 조회
  // 예시로 비워둔 배열 반환
  return [];
};

/**
 * Mock 데이터 초기화 함수 (개발/테스트용)
 * 
 * @returns {void}
 */
const clearMockData = () => {
  global.userPasswords = new Map();
};

/**
 * Mock 데이터 설정 함수 (테스트용)
 * 
 * @param {Map} data - 설정할 Mock 데이터
 * @returns {void}
 */
const setMockData = (data) => {
  global.userPasswords = data;
};

// 함수형 프로그래밍 방식으로 모듈 내보내기
module.exports = {
  // 순수 함수들
  isValidUniversityEmail,
  hashPassword,
  verifyPassword,
  maskStudentInfo,
  createSessionData,
  
  // 데이터 조작 함수들 (사이드 이펙트 있음)
  isEmailExists,
  findStudentByEmail,
  createStudent,
  authenticateStudent,
  getAllStudents,
  
  // 유틸리티 함수들
  clearMockData,
  setMockData
};