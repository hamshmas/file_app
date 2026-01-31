import mongoose, { Schema, Document } from 'mongoose';

// 법원 유형
export type CourtType = 'busan' | 'daegu' | 'daejeon' | 'jeonju' | 'cheongju';

// 사건 상태
export type CaseStatus = 'collecting' | 'processing' | 'reviewing' | 'completed';

// 채권자 정보
export interface ICreditor {
  순번: number;
  채권자명: string;
  주소?: string;
  채권원인: string;
  원금: number;
  이자: number;
  지연손해금: number;
  총채권액: number;
  담보여부: boolean;
  담보내용?: string;
}

// 재산 정보
export interface IAsset {
  종류: '부동산' | '자동차' | '보험' | '예금' | '주식' | '가상자산' | '기타';
  상세내용: string;
  시가: number;
  담보권설정액?: number;
  청산가치: number;
}

// 소득 정보
export interface IIncome {
  유형: '급여' | '영업' | '연금' | '기타';
  월수입: number;
  상세내용?: string;
}

// 지출 정보
export interface IExpense {
  항목: string;
  월지출: number;
}

// 추출된 데이터
export interface IExtractedData {
  creditors: ICreditor[];
  assets: IAsset[];
  income: IIncome[];
  expenses: IExpense[];
  totalDebt?: number;          // 총 채무액
  totalAssets?: number;        // 총 재산
  liquidationValue?: number;   // 청산가치
  monthlyIncome?: number;      // 월 수입
  monthlyExpense?: number;     // 월 지출 (생계비)
  availableIncome?: number;    // 가용소득
}

// 사건 인터페이스
export interface ICase extends Document {
  courtType: CourtType;
  debtorName: string;
  debtorIdNumber?: string;  // 암호화하여 저장
  debtorPhone?: string;
  debtorAddress?: string;
  status: CaseStatus;
  documents: mongoose.Types.ObjectId[];
  extractedData: IExtractedData;
  generatedDocuments: {
    creditorList?: mongoose.Types.ObjectId;
    assetList?: mongoose.Types.ObjectId;
    incomeExpenseList?: mongoose.Types.ObjectId;
    repaymentPlan?: mongoose.Types.ObjectId;
  };
  repaymentPlan?: {
    변제기간: number;  // 개월
    월변제금: number;
    총변제금: number;
    변제율: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CaseSchema = new Schema<ICase>({
  courtType: {
    type: String,
    enum: ['busan', 'daegu', 'daejeon', 'jeonju', 'cheongju'],
    required: true,
    default: 'busan'
  },
  debtorName: {
    type: String,
    required: true
  },
  debtorIdNumber: String,
  debtorPhone: String,
  debtorAddress: String,
  status: {
    type: String,
    enum: ['collecting', 'processing', 'reviewing', 'completed'],
    default: 'collecting'
  },
  documents: [{
    type: Schema.Types.ObjectId,
    ref: 'Document'
  }],
  extractedData: {
    creditors: [{
      순번: Number,
      채권자명: String,
      주소: String,
      채권원인: String,
      원금: Number,
      이자: Number,
      지연손해금: Number,
      총채권액: Number,
      담보여부: Boolean,
      담보내용: String
    }],
    assets: [{
      종류: String,
      상세내용: String,
      시가: Number,
      담보권설정액: Number,
      청산가치: Number
    }],
    income: [{
      유형: String,
      월수입: Number,
      상세내용: String
    }],
    expenses: [{
      항목: String,
      월지출: Number
    }],
    totalDebt: Number,
    totalAssets: Number,
    liquidationValue: Number,
    monthlyIncome: Number,
    monthlyExpense: Number,
    availableIncome: Number
  },
  generatedDocuments: {
    creditorList: { type: Schema.Types.ObjectId, ref: 'GeneratedDocument' },
    assetList: { type: Schema.Types.ObjectId, ref: 'GeneratedDocument' },
    incomeExpenseList: { type: Schema.Types.ObjectId, ref: 'GeneratedDocument' },
    repaymentPlan: { type: Schema.Types.ObjectId, ref: 'GeneratedDocument' }
  },
  repaymentPlan: {
    변제기간: Number,
    월변제금: Number,
    총변제금: Number,
    변제율: Number
  }
}, {
  timestamps: true
});

export default mongoose.model<ICase>('Case', CaseSchema);
