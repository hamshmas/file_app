import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

// 서류 카테고리 (부산회생법원 기준)
export type DocumentCategory =
  | 'personal_info'      // 인적 사항 및 주거 관련
  | 'creditor_list'      // 개인회생채권자목록 관련
  | 'asset_list'         // 재산목록 관련
  | 'income_expense';    // 수입 및 지출 관련

// 서류 하위 카테고리
export type DocumentSubcategory =
  // 인적 사항 및 주거 관련
  | 'family_relation'        // 가족관계증명서
  | 'marriage_relation'      // 혼인관계증명서
  | 'resident_registration'  // 주민등록등본/초본
  | 'housing'                // 주거사항 자료
  // 채권자목록 관련
  | 'debt_certificate'       // 부채증명서
  | 'loan_contract'          // 차용증
  | 'court_judgment'         // 판결서
  // 재산목록 관련
  | 'tax_certificate'        // 지방세 세목별 과세증명서
  | 'land_registry'          // 부동산 지적전산자료
  | 'real_estate'            // 부동산등기사항전부증명서
  | 'vehicle'                // 자동차등록원부
  | 'bank_statement'         // 은행 계좌거래내역서
  | 'credit_card'            // 신용카드 사용내역서
  | 'insurance'              // 보험가입내역
  | 'crypto_stock'           // 가상자산/주식
  // 수입 및 지출 관련
  | 'expense_plan'           // 생계비 지출계획
  | 'health_insurance'       // 건강보험자격득실확인서
  | 'pension'                // 연금산정용 가입내역확인서
  | 'employment'             // 재직증명서
  | 'salary'                 // 급여액 자료
  | 'retirement'             // 퇴직금계산서
  | 'business_registration'  // 사업자등록증명
  | 'income_certificate'     // 소득금액증명
  | 'business_income'        // 영업소득 자료
  | 'welfare'                // 연금/생활보호 수급증명서
  // 기타
  | 'credit_education'       // 신용교육 이수증
  | 'other';                 // 기타

// OCR 상태
export type OcrStatus = 'pending' | 'processing' | 'completed' | 'corrected' | 'failed';

// 파일 유형
export type FileType = 'pdf' | 'image' | 'hwp' | 'other';

// 문서 인터페이스
export interface IDocument extends MongoDocument {
  caseId: mongoose.Types.ObjectId;
  category: DocumentCategory;
  subcategory: DocumentSubcategory;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  fileType: FileType;
  isScanned: boolean;
  ocrStatus: OcrStatus;
  extractedText?: string;
  correctedText?: string;      // Gemini 후보정 텍스트
  structuredData?: any;        // 구조화된 데이터 (JSON)
  ocrConfidence?: number;      // OCR 신뢰도 (0-1)
  needsCorrection?: boolean;   // 후보정 필요 여부
  uploadedAt: Date;
  processedAt?: Date;
}

const DocumentSchema = new Schema<IDocument>({
  caseId: {
    type: Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  category: {
    type: String,
    enum: ['personal_info', 'creditor_list', 'asset_list', 'income_expense'],
    required: true
  },
  subcategory: {
    type: String,
    enum: [
      'family_relation', 'marriage_relation', 'resident_registration', 'housing',
      'debt_certificate', 'loan_contract', 'court_judgment',
      'tax_certificate', 'land_registry', 'real_estate', 'vehicle',
      'bank_statement', 'credit_card', 'insurance', 'crypto_stock',
      'expense_plan', 'health_insurance', 'pension', 'employment',
      'salary', 'retirement', 'business_registration', 'income_certificate',
      'business_income', 'welfare', 'credit_education', 'other'
    ],
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  storagePath: {
    type: String,
    required: true
  },
  mimeType: String,
  fileSize: Number,
  fileType: {
    type: String,
    enum: ['pdf', 'image', 'hwp', 'other'],
    default: 'other'
  },
  isScanned: {
    type: Boolean,
    default: false
  },
  ocrStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'corrected', 'failed'],
    default: 'pending'
  },
  extractedText: String,
  correctedText: String,
  structuredData: Schema.Types.Mixed,
  ocrConfidence: Number,
  needsCorrection: Boolean,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date
});

// 인덱스 설정
DocumentSchema.index({ caseId: 1 });
DocumentSchema.index({ category: 1, subcategory: 1 });
DocumentSchema.index({ ocrStatus: 1 });

export default mongoose.model<IDocument>('Document', DocumentSchema);
