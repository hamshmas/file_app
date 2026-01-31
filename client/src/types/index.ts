// 사건 상태
export type CaseStatus = 'collecting' | 'processing' | 'reviewing' | 'completed'

// 문서 카테고리
export type DocumentCategory = 'personal_info' | 'creditor_list' | 'asset_list' | 'income_expense'

// OCR 상태
export type OcrStatus = 'pending' | 'processing' | 'completed' | 'corrected' | 'failed'

// 파일 유형
export type FileType = 'pdf' | 'image' | 'hwp' | 'other'

// 사건 인터페이스
export interface ICase {
  _id: string
  courtType: string
  debtorName: string
  debtorPhone?: string
  debtorAddress?: string
  status: CaseStatus
  documents: string[]
  extractedData?: IExtractedData
  createdAt: string
  updatedAt: string
}

// 추출된 데이터
export interface IExtractedData {
  creditors: ICreditor[]
  assets: IAsset[]
  income: IIncome[]
  expenses: IExpense[]
  totalDebt?: number
  totalAssets?: number
  liquidationValue?: number
  monthlyIncome?: number
  monthlyExpense?: number
  availableIncome?: number
}

// 채권자
export interface ICreditor {
  순번: number
  채권자명: string
  주소?: string
  채권원인: string
  원금: number
  이자: number
  지연손해금: number
  총채권액: number
  담보여부: boolean
  담보내용?: string
}

// 재산
export interface IAsset {
  재산유형: string
  재산명: string
  소재지?: string
  상세정보?: string
  시가: number
  담보권설정액?: number
  청산가치?: number
  취득일자?: string
  비고?: string
}

// 수입
export interface IIncome {
  소득유형: string
  소득원: string
  월소득액: number
  비고?: string
}

// 지출
export interface IExpense {
  지출항목: string
  월지출액: number
  비고?: string
}

// 문서 인터페이스
export interface IDocument {
  _id: string
  caseId: string
  category: DocumentCategory
  subcategory: string
  originalFilename: string
  storagePath: string
  mimeType: string
  fileSize: number
  fileType: FileType
  isScanned: boolean
  ocrStatus: OcrStatus
  extractedText?: string
  correctedText?: string
  structuredData?: Record<string, unknown>
  ocrConfidence?: number
  needsCorrection?: boolean
  uploadedAt: string
  processedAt?: string
}

// API 응답
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 사건 통계
export interface CaseStats {
  totalDocuments: number
  completedOcr: number
  pendingOcr: number
  totalDebt: number
  totalAssets: number
  liquidationValue: number
  creditorCount: number
}

// 카테고리 정보
export interface CategoryInfo {
  id: string
  name: string
  description: string
  required: boolean
}

export interface SubcategoryInfo extends CategoryInfo {
  parentId: string
  순번?: number
}
