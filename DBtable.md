<user>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	유저 고유 ID (자동 증가)
email	VARCHAR(100)	UNIQUE, NOT NULL	사용자 이메일
nickname	VARCHAR(30)	NOT NULL	닉네임
profile_image	TEXT		프로필 이미지 URL
university_id	INT	REFERENCES university(id)	소속 대학 ID
created_at	TIMESTAMP	DEFAULT NOW()	가입일시
<user_metrics>			
컬럼명	데이터 타입	제약 조건	설명
user_id 	INT	PRIMARY KEY, REFERENCES user(id)	유저 ID (1:1)
bucket_count	INT	DEFAULT 0	보유 적금통 수
success_days	INT	DEFAULT 0	누적 성공 일수(모든 버킷 합산)
current_streak	INT	DEFAULT 0	현재 연속 성공 일수
last_success_date	DATE		마지막 성공 일자(KST)
challenge_success_count	INT	DEFAULT 0	
last_bucket_created_at	TIMESTAMP		마지막 적금통 생성 시각
updated_at	TIMESTAMP	DEFAULT NOW()	갱신 시각
			
<user_friend>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	친구 관계 고유 ID
user_id	INT	REFERENCES user(id)	친구 요청 보낸 유저
friend_id	INT	REFERENCES user(id)	친구 요청 받은 유저
created_at	TIMESTAMP	DEFAULT NOW()	친구 관계 생성 일시
UNIQUE	(user_id, friend_id)		동일한 친구 중복 생성 방지
			
<university>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	대학 고유 ID
name	VARCHAR(100)	UNIQUE, NOT NULL	대학명 (예: 연세대학교)
domain	VARCHAR(100)	UNIQUE	이메일 도메인 (예: yonsei.ac.kr)
created_at	TIMESTAMP	DEFAULT NOW()	등록 일시
			
<saving_bucket>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	적금통 고유 ID
user_id	INT	REFERENCES user(id)	적금통 생성자
saving_product_id	VARCHAR(100)	NOT NULL	외부 적금 상품 ID
saving_challenge_id	INT	REFERENCES saving_challenge(id) (nullable)	챌린지와 연결된 경우
product_type 	VARCHAR(20)        	CHECK (product_type IN ('정기적금', '정기예금'))        	적금통이 어떤 유형인지 구분
name	VARCHAR(100)	NOT NULL	적금통 제목
description	TEXT		설명
target_amount	INT	NOT NULL	목표 금액
target_date	DATE	NOT NULL	만기일
deposit_cycle	TEXT	CHECK (deposit_cycle IN ('daily','weekly','monthly'))	적립 주기
color	VARCHAR(7)		HEX 코드 색상
is_public	BOOLEAN	DEFAULT TRUE	공개 여부
is_anonymous	BOOLEAN	DEFAULT FALSE	익명 여부
status	VARCHAR(20)	DEFAULT 'in_progress'	in_progress, success, failed 상태
total_days	INT		챌린지 전체 일수
success_days	INT	DEFAULT 0	성공한 날 수
fail_days	INT	DEFAULT 0	실패한 날 수
last_progress_date	DATE		마지막 이체 날짜
like_count	INT	DEFAULT 0	좋아요 누적 수
view_count	INT	DEFAULT 0	조회수 누적
created_at	TIMESTAMP	DEFAULT NOW()	생성일
character_item_id	INT	REFERENCES cosmetic_item(id)	장착 캐릭터(보유품만 허용)
background_item_id	INT	REFERENCES cosmetic_item(id)	장착 배경(보유품만 허용)
outfit_item_id	INT	REFERENCES cosmetic_item(id)	장착 한벌옷(보유품만 허용)
hat_item_id	INT	REFERENCES cosmetic_item(id)	장착 모자(보유품만 허용)
			
<cosmetic_item>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	아이템 고유 ID
type	VARCHAR(20)	CHECK (type IN ('character','background','outfit','hat')) NOT NULL	아이템 분류
name	VARCHAR(100)	NOT NULL	아이템 이름
description	TEXT		설명
asset_url	TEXT	NOT NULL	렌더링용 에셋 경로(이미지/JSON 등)
rarity	VARCHAR(20)		희귀도(선택)
is_default	BOOLEAN	DEFAULT FALSE	기본 제공 여부
created_at	TIMESTAMP	DEFAULT NOW()	생성일
			
<cosmetic_item_type>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	아이템 종류 고유 ID
code	TEXT 	UNIQUE, NOT NULL	종류 코드 (예: character, background, outfit, hat)
name	TEXT 	NOT NULL	표시명 (예: 캐릭터, 배경, 한벌옷, 모자)
created_at	TIMESTAMP	DEFAULT NOW()	생성일
			
<user_inventory>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	고유 ID
user_id	INT	REFERENCES user(id) NOT NULL	유저 ID
item_id	INT	REFERENCES cosmetic_item(id) NOT NULL	보유 아이템
acquired_at	TIMESTAMP	DEFAULT NOW()	획득 시각
UNIQUE	(user_id, item_id)		동일 아이템 중복 보유 방지
			
<achievement>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	업적 ID
code	VARCHAR(50)	UNIQUE, NOT NULL	업적 코드(프로그램 키)
title	VARCHAR(100)	NOT NULL	업적 제목
description	TEXT		업적 설명
condition	JSONB		달성 조건(예: {"type":"streak","days":7})
is_active	BOOLEAN	DEFAULT TRUE	활성 여부
created_at	TIMESTAMP	DEFAULT NOW()	생성일
			
<achievement_reward>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	고유 ID
achievement_id	INT	REFERENCES achievement(id) NOT NULL	업적 ID
item_id	INT	REFERENCES cosmetic_item(id) NOT NULL	지급 아이템
UNIQUE	(achievement_id, item_id)		동일 매핑 중복 방지
			
<user_achievement>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	고유 ID
user_id	INT	REFERENCES user(id) NOT NULL	유저 ID
achievement_id	INT	REFERENCES achievement(id) NOT NULL	업적 ID
unlocked_at	TIMESTAMP	DEFAULT NOW()	획득 시각
meta	JSONB		부가 정보(당시 기록 등)
UNIQUE	(user_id, achievement_id)		같은 업적 중복 획득 방지
			
<saving_bucket_progress>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	고유 ID
bucket_id	INT	REFERENCES saving_bucket(id)	적금통 ID
user_id	INT	REFERENCES user(id)	유저 ID
date	DATE	NOT NULL	이체한 날짜
status	VARCHAR(10)	CHECK (status IN ('success','failed'))	해당 날짜의 결과
created_at	TIMESTAMP	DEFAULT NOW()	기록 시각
			
<saving_challenge>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	챌린지 고유 ID
title	VARCHAR(100)	NOT NULL	챌린지 제목
description	TEXT		챌린지 설명
saving_product_id	VARCHAR(100)	NOT NULL	외부 API 상품 ID
start_date	DATE	NOT NULL	챌린지 시작일
end_date	DATE	NOT NULL	챌린지 종료일
created_at	TIMESTAMP	DEFAULT NOW()	생성일
			
<saving_bucket_like>			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	고유 ID
bucket_id	INT	REFERENCES saving_bucket(id)	적금통 ID
user_id	INT	REFERENCES user(id)	좋아요 누른 사용자 ID
created_at	TIMESTAMP	DEFAULT NOW()	좋아요 누른 시각
UNIQUE	(bucket_id, user_id)		중복 좋아요 방지
			
<saving_bucket_comment> 			
컬럼명	데이터 타입	제약 조건	설명
id	SERIAL	PRIMARY KEY	댓글 고유 ID
bucket_id	INT	REFERENCES saving_bucket(id)	댓글이 달린 적금통
user_id	INT	REFERENCES user(id)	댓글을 작성한 유저
content	TEXT	NOT NULL CHECK (char_length(content) <= 500)	댓글 내용 (최대 500자)
created_at	TIMESTAMP	DEFAULT NOW()	작성 시각