/**
 * 적금통 서비스 - 함수형 프로그래밍 방식
 * 
 * 기능: 적금통 생성/관리, Mock 입금, 목표 달성 추적, 거래 내역 관리
 * 아키텍처: 순수 함수 중심, 불변성 유지, 사이드 이펙트 분리
 * Mock: 실제 은행 API 대신 시뮬레이션 데이터 사용
 */

const savingsBucketModel = require('../models/savingsBucketModel');
const userModel = require('../models/userModel');

/**
 * 적금통 진척률 계산 함수 (순수 함수)
 * 
 * @param {number} currentAmount - 현재 금액
 * @param {number} targetAmount - 목표 금액
 * @returns {number} 진척률 (0-100)
 */
const calculateProgressRate = (currentAmount, targetAmount) => {
  if (targetAmount <= 0) return 0;
  return Math.round((currentAmount / targetAmount) * 100);
};

/**
 * 남은 금액 계산 함수 (순수 함수)
 * 
 * @param {number} currentAmount - 현재 금액
 * @param {number} targetAmount - 목표 금액
 * @returns {number} 남은 금액 (최소 0)
 */
const calculateRemainingAmount = (currentAmount, targetAmount) => {
  return Math.max(0, targetAmount - currentAmount);
};

/**
 * 목표 달성 여부 확인 함수 (순수 함수)
 * 
 * @param {number} currentAmount - 현재 금액
 * @param {number} targetAmount - 목표 금액
 * @returns {boolean} 목표 달성 여부
 */
const isGoalAchieved = (currentAmount, targetAmount) => {
  return currentAmount >= targetAmount;
};

/**
 * 적금통 상세 정보 계산 함수 (순수 함수)
 * 
 * @param {Object} savings - 기본 적금통 정보
 * @returns {Object} 계산된 상세 정보가 포함된 적금통 객체
 */
const enrichSavingsData = (savings) => {
  const progressRate = calculateProgressRate(savings.currentAmount, savings.targetAmount);
  const remainingAmount = calculateRemainingAmount(savings.currentAmount, savings.targetAmount);
  const goalAchieved = isGoalAchieved(savings.currentAmount, savings.targetAmount);

  return {
    ...savings,
    progressRate,
    remainingAmount,
    isGoalAchieved: goalAchieved
  };
};

/**
 * 거래 내역 생성 함수 (순수 함수)
 * 
 * @param {Object} transactionData - 거래 데이터
 * @returns {Object} 생성된 거래 내역 객체
 */
const createTransaction = ({ savingsId, type, amount, memo, balance }) => {
  return {
    id: transactionIdCounter++,
    savingsId,
    type,
    amount,
    memo,
    timestamp: new Date(),
    balance
  };
};

/**
 * 새 적금통 생성 함수
 * 
 * @param {Object} savingsData - 적금통 생성 데이터
 * @param {string} studentEmail - 학생 이메일
 * @returns {Promise<Object>} 생성된 적금통 정보
 */
const createSavings = async ({ name, targetAmount, targetDate, autoTransferAmount, autoTransferCycle }, studentEmail) => {
  // 사용자 조회
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다');
  }

  // 적금통 데이터 준비
  const bucketData = {
    userId: user.id,
    savingProductId: 'MOCK_PRODUCT_001', // Mock 상품 ID
    productType: '정기적금',
    name,
    description: null,
    targetAmount,
    targetDate,
    depositCycle: autoTransferCycle || 'monthly',
    color: '#4F46E5', // 기본 색상
    isPublic: true,
    isAnonymous: false,
    totalDays: calculateTotalDays(new Date(), new Date(targetDate))
  };

  const bucket = await savingsBucketModel.createSavingsBucket(bucketData);
  return enrichSavingsData(bucket);
};

/**
 * 총 일수 계산 헬퍼 함수
 */
const calculateTotalDays = (startDate, endDate) => {
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 학생 이메일로 적금통 목록 조회 함수
 * 
 * @param {string} studentEmail - 학생 이메일
 * @returns {Promise<Array>} 학생의 적금통 목록 (상세 정보 포함)
 */
const findSavingsByStudentEmail = async (studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) {
    return [];
  }

  const buckets = await savingsBucketModel.getSavingsBucketsByUser(user.id);
  return buckets.map(enrichSavingsData);
};

/**
 * 적금통 ID로 적금통 조회 함수
 * 
 * @param {number} savingsId - 적금통 ID
 * @returns {Promise<Object|null>} 적금통 정보 또는 null
 */
const findSavingsById = async (savingsId) => {
  const bucket = await savingsBucketModel.getSavingsBucketById(savingsId);
  return bucket ? enrichSavingsData(bucket) : null;
};

/**
 * 적금통 소유권 확인 함수
 * 
 * @param {number} savingsId - 적금통 ID
 * @param {string} studentEmail - 학생 이메일
 * @returns {Promise<boolean>} 소유권 여부
 */
const isSavingsOwner = async (savingsId, studentEmail) => {
  const user = await userModel.findUserByEmail(studentEmail);
  if (!user) return false;

  const bucket = await savingsBucketModel.getSavingsBucketById(savingsId);
  return bucket && bucket.user_id === user.id;
};

/**
 * 거래 내역 조회 함수
 * 
 * @param {number} savingsId - 적금통 ID
 * @returns {Array} 거래 내역 목록
 */
const getTransactionsBySavingsId = (savingsId) => {
  return mockTransactions.get(savingsId) || [];
};

/**
 * 입금 처리 함수 (Mock)
 * 
 * @param {number} savingsId - 적금통 ID
 * @param {number} amount - 입금 금액
 * @param {string} memo - 메모 (선택)
 * @returns {Promise<Object>} 업데이트된 적금통 정보와 거래 내역
 * @throws {Error} 존재하지 않는 적금통인 경우
 */
const processDeposit = async (savingsId, amount, memo = '') => {
  const bucket = await savingsBucketModel.getSavingsBucketById(savingsId);
  if (!bucket) {
    throw new Error('적금통을 찾을 수 없습니다');
  }

  // 오늘 날짜로 성공 기록 추가
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
  const progressRecord = await savingsBucketModel.recordBucketProgress(
    savingsId,
    bucket.user_id,
    today,
    'success'
  );

  // 업데이트된 적금통 정보 조회
  const updatedBucket = await savingsBucketModel.getSavingsBucketById(savingsId);
  const enrichedBucket = enrichSavingsData(updatedBucket);
  
  // Mock 거래 내역 (실제로는 외부 API 연동)
  const transaction = {
    id: Date.now(),
    type: 'deposit',
    amount,
    memo,
    timestamp: new Date(),
    balance: enrichedBucket.success_days * 10000 // 임시 계산
  };

  return {
    savings: enrichedBucket,
    transaction,
    isGoalAchieved: enrichedBucket.progress_rate >= 100
  };
};

/**
 * 적금통과 거래 내역을 함께 조회하는 함수
 * 
 * @param {number} savingsId - 적금통 ID
 * @returns {Promise<Object|null>} 적금통 정보와 거래 내역
 */
const getSavingsWithTransactions = async (savingsId) => {
  const bucket = await findSavingsById(savingsId);
  if (!bucket) return null;

  const progress = await savingsBucketModel.getBucketProgress(savingsId);
  
  return {
    ...bucket,
    transactions: progress // 진행 상황을 거래 내역 대신 사용
  };
};

/**
 * 학생별 총 적금액 계산 함수
 * 
 * @param {string} studentEmail - 학생 이메일
 * @returns {number} 총 적금액
 */
const calculateTotalSavingsByStudent = (studentEmail) => {
  return Array.from(mockSavings.values())
    .filter(savings => savings.studentEmail === studentEmail)
    .reduce((total, savings) => total + savings.currentAmount, 0);
};

/**
 * 목표 달성한 적금통 개수 계산 함수
 * 
 * @param {string} studentEmail - 학생 이메일
 * @returns {number} 목표 달성한 적금통 개수
 */
const countCompletedGoals = (studentEmail) => {
  return Array.from(mockSavings.values())
    .filter(savings => savings.studentEmail === studentEmail)
    .filter(savings => isGoalAchieved(savings.currentAmount, savings.targetAmount))
    .length;
};

/**
 * Mock 데이터 초기화 함수 (개발/테스트용)
 * 
 * @returns {void}
 */
const clearMockData = () => {
  // DB 연동으로 변경되어 실제 구현 불필요
  console.log('DB 연동 모드에서는 clearMockData가 동작하지 않습니다');
};

/**
 * Mock 데이터 설정 함수 (테스트용)
 * 
 * @param {Map} savingsData - 적금통 데이터
 * @param {Map} transactionsData - 거래 내역 데이터
 * @returns {void}
 */
const setMockData = (savingsData, transactionsData) => {
  // DB 연동으로 변경되어 실제 구현 불필요
  console.log('DB 연동 모드에서는 setMockData가 동작하지 않습니다');
};

// 함수형 프로그래밍 방식으로 모듈 내보내기
module.exports = {
  // 순수 함수들
  calculateProgressRate,
  calculateRemainingAmount,
  isGoalAchieved,
  enrichSavingsData,
  createTransaction,

  // 데이터 조작 함수들 (사이드 이펙트 있음)
  createSavings,
  findSavingsByStudentEmail,
  findSavingsById,
  isSavingsOwner,
  getTransactionsBySavingsId,
  processDeposit,
  getSavingsWithTransactions,

  // 통계 계산 함수들
  calculateTotalSavingsByStudent,
  countCompletedGoals,

  // 유틸리티 함수들
  clearMockData,
  setMockData
};