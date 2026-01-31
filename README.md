# 개인회생 신청서 자동 작성 시스템

개인회생 절차에 필요한 서류를 OCR과 AI를 활용하여 자동으로 생성하는 웹 애플리케이션입니다.

## 주요 기능

### 1. 문서 업로드 및 관리
- PDF, 이미지(JPG, PNG, TIFF) 파일 업로드
- 카테고리별 문서 분류 (인적사항, 채권자목록, 재산목록, 수입/지출)
- 문서 삭제 기능

### 2. OCR 처리 (Gemini AI)
- **Gemini 2.5 Flash** 모델을 활용한 텍스트 추출
- PDF 및 이미지 파일 OCR 지원
- 스캔 문서/텍스트 문서 자동 판별
- 텍스트 기반 PDF는 직접 텍스트 추출 (빠른 처리)

### 3. AI 후보정 및 데이터 구조화
- OCR 결과 자동 후보정
- 문서 유형별 맞춤 데이터 추출:
  - 부채증명서: 채권자명, 대출원금, 이자, 잔액 등
  - 은행 계좌내역: 계좌번호, 잔액, 주요 거래내역
  - 급여명세서: 기본급, 수당, 공제, 실수령액
  - 보험가입내역: 보험사, 상품명, 해약환급금

### 4. 변제계획안 자동 생성
- **라이프니쯔 현가계수 계산**: 연 5% 할인율 적용
- **현재가치 계산**: 적립기간 + 변제투입기간 고려
- **청산가치 보장 검토**: 현재가치 vs 청산가치 비교

### 5. 수입 및 지출 목록 생성
- **2026년 기준 중위소득 적용**
  - 1인: 2,564,238원
  - 2인: 4,199,292원
  - 3인: 5,359,036원
  - 4인: 6,494,738원
  - 5인: 7,556,719원
  - 6인: 8,555,952원
- **생계비 계산**: 기준 중위소득의 60% (기본), 최대 150%

### 6. 법원별 기준 지원
- 서울회생법원
- 부산회생법원 (피부양자 수 계산 특례)
- 대구지방법원
- 대전지방법원
- 전주지방법원
- 청주지방법원

## 기술 스택

### Backend
- **Node.js** + **TypeScript**
- **Express** - REST API
- **MongoDB Atlas** - 클라우드 데이터베이스
- **Multer** - 파일 업로드
- **pdf-parse** - PDF 텍스트 추출

### Frontend
- **React 18** + **TypeScript**
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **React Query** - 서버 상태 관리
- **React Router** - 라우팅

### AI
- **Google Gemini 2.5 Flash** - OCR 및 텍스트 분석

## 프로젝트 구조

```
file_app/
├── client/                    # 프론트엔드
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # 대시보드
│   │   │   ├── CaseDetail.tsx      # 사건 상세
│   │   │   ├── DocumentUpload.tsx  # 문서 업로드
│   │   │   ├── DataReview.tsx      # 데이터 검토
│   │   │   └── DocumentGeneration.tsx # 문서 생성
│   │   ├── services/
│   │   │   └── api.ts              # API 클라이언트
│   │   └── types/
│   │       └── index.ts            # TypeScript 타입
│   └── ...
├── server/                    # 백엔드
│   ├── src/
│   │   ├── models/
│   │   │   ├── Case.ts             # 사건 모델
│   │   │   └── Document.ts         # 문서 모델
│   │   ├── routes/
│   │   │   ├── caseRoutes.ts       # 사건 API
│   │   │   ├── documentRoutes.ts   # 문서 API
│   │   │   └── ocrRoutes.ts        # OCR API
│   │   ├── services/
│   │   │   └── ocr/
│   │   │       ├── geminiOcrService.ts  # Gemini OCR
│   │   │       └── geminiService.ts     # AI 후보정
│   │   └── index.ts                # 서버 엔트리
│   └── ...
└── README.md
```

## 설치 및 실행

### 1. 의존성 설치

```bash
# 서버 의존성
cd server
npm install

# 클라이언트 의존성
cd ../client
npm install
```

### 2. 환경 변수 설정

`server/.env` 파일 생성:

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rehabilitation

# File Storage
UPLOAD_DIR=./uploads
OUTPUT_DIR=./output

# CORS
CLIENT_URL=http://localhost:5173

# Gemini API (https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. 개발 서버 실행

```bash
# 터미널 1: 서버 실행
cd server
npm run dev

# 터미널 2: 클라이언트 실행
cd client
npm run dev
```

- 클라이언트: http://localhost:5173
- 서버 API: http://localhost:3001/api

## API 엔드포인트

### 사건 관리
- `GET /api/cases` - 사건 목록
- `POST /api/cases` - 사건 생성
- `GET /api/cases/:id` - 사건 상세
- `DELETE /api/cases/:id` - 사건 삭제
- `GET /api/cases/:id/stats` - 사건 통계

### 문서 관리
- `GET /api/documents/case/:caseId` - 문서 목록
- `POST /api/documents/upload` - 문서 업로드
- `DELETE /api/documents/:id` - 문서 삭제

### OCR 처리
- `POST /api/ocr/process/:documentId` - 개별 OCR 처리
- `POST /api/ocr/process-all/:caseId` - 일괄 OCR 처리
- `POST /api/ocr/correct/:documentId` - 후보정 처리

## 핵심 계산 공식

### 라이프니쯔 복리연금현가율
```
현가율 = (1 - (1 + r)^(-n)) / r
```
- r: 월 할인율 (연 5% / 12)
- n: 변제투입기간 (개월)

### 현재가치 계산
```
현재가치 = 월변제액 × (적립기간 + 라이프니쯔현가율)
```

## 버전 히스토리

### v0.2.0 (2025-01-29)
- Gemini 2.5 Flash 기반 OCR 구현
- OCR 후 자동 AI 후보정 적용
- OCR 결과 보기 모달 추가
- 문서 삭제 기능 추가
- 프론트엔드 UI 개선

### v0.1.0
- 프로젝트 초기 설정
- 기본 데이터 모델 설계
- 변제계획안 계산 로직

## 참고 자료

- [서울회생법원 변제계획안 작성방법](http://slb.scourt.go.kr)
- [부산회생법원 생계비검토위원회 의결사항](http://bsb.scourt.go.kr)
- [Google AI Studio - Gemini API](https://aistudio.google.com)
- 2026년 기준 중위소득 (보건복지부 고시)

## 라이선스

MIT License
