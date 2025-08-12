/**
 * PostgreSQL 데이터베이스 연결 설정
 * 
 * 기능: DB 연결 풀 관리, 연결 상태 확인, 에러 핸들링
 * 보안: 환경변수를 통한 접속 정보 관리, SSL 설정
 * 성능: 커넥션 풀링을 통한 효율적인 DB 연결 관리
 */

const { Pool } = require('pg');

/**
 * PostgreSQL 연결 풀 설정
 * 입력: 환경변수 (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
 * 출력: 설정된 커넥션 풀 객체
 * 예외: 잘못된 연결 정보, 네트워크 오류
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'hey_young_campus',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  
  // 연결 풀 설정
  max: 20,           // 최대 연결 수
  idleTimeoutMillis: 30000,  // 유휴 연결 해제 시간
  connectionTimeoutMillis: 2000,  // 연결 타임아웃
  
  // SSL 설정 (운영환경에서 필요시)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * 데이터베이스 연결 상태 확인
 * 
 * 입력: 없음
 * 출력: 연결 성공 여부 (Promise<boolean>)
 * 부작용: 콘솔에 연결 상태 로그 출력
 * 예외: 연결 실패시 false 반환
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('✅ PostgreSQL 데이터베이스 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    return false;
  }
}

/**
 * 데이터베이스 테이블 초기화 (실제 DB 스키마 반영)
 * DBtable.md 문서의 테이블 구조에 맞춰 생성
 * 
 * 입력: 없음
 * 출력: 초기화 성공 여부 (Promise<boolean>)
 * 부작용: 테이블 생성 또는 초기화
 * 예외: 테이블 생성 실패시 에러 로그 출력
 */
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // 대학 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS university (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        domain VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 사용자 테이블 (기존 students 대신)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        nickname VARCHAR(30) NOT NULL,
        profile_image TEXT,
        university_id INT REFERENCES university(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 사용자 메트릭스 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_metrics (
        user_id INT PRIMARY KEY REFERENCES "user"(id),
        bucket_count INT DEFAULT 0,
        success_days INT DEFAULT 0,
        current_streak INT DEFAULT 0,
        last_success_date DATE,
        challenge_success_count INT DEFAULT 0,
        last_bucket_created_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 친구 관계 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_friend (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES "user"(id),
        friend_id INT REFERENCES "user"(id),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, friend_id)
      )
    `);

    // 코스메틱 아이템 종류 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS cosmetic_item_type (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 코스메틱 아이템 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS cosmetic_item (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) CHECK (type IN ('character','background','outfit','hat')) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        asset_url TEXT NOT NULL,
        rarity VARCHAR(20),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 사용자 인벤토리 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES "user"(id) NOT NULL,
        item_id INT REFERENCES cosmetic_item(id) NOT NULL,
        acquired_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, item_id)
      )
    `);

    // 저축 챌린지 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS saving_challenge (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        saving_product_id VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 적금통 테이블 (업데이트된 스키마)
    await client.query(`
      CREATE TABLE IF NOT EXISTS saving_bucket (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES "user"(id),
        saving_product_id VARCHAR(100) NOT NULL,
        saving_challenge_id INT REFERENCES saving_challenge(id),
        product_type VARCHAR(20) CHECK (product_type IN ('정기적금', '정기예금')),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        target_amount INT NOT NULL,
        target_date DATE NOT NULL,
        deposit_cycle TEXT CHECK (deposit_cycle IN ('daily','weekly','monthly')),
        color VARCHAR(7),
        is_public BOOLEAN DEFAULT TRUE,
        is_anonymous BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'in_progress',
        total_days INT,
        success_days INT DEFAULT 0,
        fail_days INT DEFAULT 0,
        last_progress_date DATE,
        like_count INT DEFAULT 0,
        view_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        character_item_id INT REFERENCES cosmetic_item(id),
        background_item_id INT REFERENCES cosmetic_item(id),
        outfit_item_id INT REFERENCES cosmetic_item(id),
        hat_item_id INT REFERENCES cosmetic_item(id)
      )
    `);

    // 적금통 진행 상황 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS saving_bucket_progress (
        id SERIAL PRIMARY KEY,
        bucket_id INT REFERENCES saving_bucket(id),
        user_id INT REFERENCES "user"(id),
        date DATE NOT NULL,
        status VARCHAR(10) CHECK (status IN ('success','failed')),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 업적 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievement (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        condition JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 업적 보상 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievement_reward (
        id SERIAL PRIMARY KEY,
        achievement_id INT REFERENCES achievement(id) NOT NULL,
        item_id INT REFERENCES cosmetic_item(id) NOT NULL,
        UNIQUE(achievement_id, item_id)
      )
    `);

    // 사용자 업적 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_achievement (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES "user"(id) NOT NULL,
        achievement_id INT REFERENCES achievement(id) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT NOW(),
        meta JSONB,
        UNIQUE(user_id, achievement_id)
      )
    `);

    // 적금통 좋아요 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS saving_bucket_like (
        id SERIAL PRIMARY KEY,
        bucket_id INT REFERENCES saving_bucket(id),
        user_id INT REFERENCES "user"(id),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(bucket_id, user_id)
      )
    `);

    // 적금통 댓글 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS saving_bucket_comment (
        id SERIAL PRIMARY KEY,
        bucket_id INT REFERENCES saving_bucket(id),
        user_id INT REFERENCES "user"(id),
        content TEXT NOT NULL CHECK (char_length(content) <= 500),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ 실제 DB 테이블 스키마 초기화 완료');
    return true;

  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * 애플리케이션 종료시 DB 연결 해제
 * 
 * 입력: 없음
 * 출력: 없음
 * 부작용: 모든 DB 연결 종료
 * 예외: 연결 해제 실패시 에러 로그 출력
 */
async function closeDatabase() {
  try {
    await pool.end();
    console.log('✅ 데이터베이스 연결이 안전하게 종료되었습니다');
  } catch (error) {
    console.error('❌ 데이터베이스 연결 종료 실패:', error);
  }
}

// Graceful shutdown 처리
process.on('SIGINT', closeDatabase);
process.on('SIGTERM', closeDatabase);

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
  closeDatabase
};