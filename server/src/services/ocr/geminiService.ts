import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini 클라이언트
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

interface CorrectionResult {
  text: string;
  structuredData: any;
}

// 문서 유형별 프롬프트 템플릿
const PROMPTS: { [key: string]: string } = {
  debt_certificate: `
다음은 부채증명서에서 OCR로 추출한 텍스트입니다.
OCR 오류를 수정하고, 다음 정보를 구조화된 JSON으로 추출해주세요:
- 채권자명
- 채권자 주소
- 대출일자
- 대출원금
- 현재 잔액 (원금 + 이자)
- 이자율
- 연체이자율
- 대출 종류 (신용대출, 담보대출 등)

OCR 텍스트:
`,
  bank_statement: `
다음은 은행 계좌거래내역서에서 OCR로 추출한 텍스트입니다.
OCR 오류를 수정하고, 다음 정보를 구조화된 JSON으로 추출해주세요:
- 은행명
- 계좌번호
- 예금주
- 조회기간
- 현재잔액
- 주요 거래내역 (100만원 이상의 입출금)

OCR 텍스트:
`,
  salary: `
다음은 급여명세서/급여 관련 서류에서 OCR로 추출한 텍스트입니다.
OCR 오류를 수정하고, 다음 정보를 구조화된 JSON으로 추출해주세요:
- 회사명
- 직원명
- 기본급
- 각종 수당
- 공제항목 (세금, 보험료 등)
- 실수령액
- 급여 지급일

OCR 텍스트:
`,
  insurance: `
다음은 보험가입내역 또는 해약환급금 증명서에서 OCR로 추출한 텍스트입니다.
OCR 오류를 수정하고, 다음 정보를 구조화된 JSON으로 추출해주세요:
- 보험회사명
- 보험상품명
- 계약자
- 피보험자
- 계약일자
- 월 보험료
- 해약환급금 (현재 기준)
- 보험 상태 (유지/해지/실효)

OCR 텍스트:
`,
  credit_card: `
다음은 신용카드 사용내역서에서 OCR로 추출한 텍스트입니다.
OCR 오류를 수정하고, 다음 정보를 구조화된 JSON으로 추출해주세요:
- 카드사명
- 카드번호 (마스킹된 상태 유지)
- 조회기간
- 총 사용금액
- 결제예정금액
- 100만원 이상 거래내역 (날짜, 가맹점, 금액)

OCR 텍스트:
`,
  default: `
다음은 개인회생 신청 관련 서류에서 OCR로 추출한 텍스트입니다.
1. OCR 오류(잘못 인식된 문자, 깨진 텍스트 등)를 수정해주세요.
2. 금액은 숫자로, 날짜는 YYYY-MM-DD 형식으로 정규화해주세요.
3. 중요 정보를 구조화된 JSON으로 추출해주세요.

OCR 텍스트:
`
};

// 후보정 요청 형식 지정
const FORMAT_INSTRUCTION = `

응답 형식:
{
  "correctedText": "수정된 전체 텍스트",
  "structuredData": {
    // 추출된 구조화된 데이터
  },
  "corrections": [
    // 수정한 내용 목록 (선택사항)
  ]
}

JSON 형식으로만 응답해주세요.
`;

// Gemini로 OCR 결과 후보정
export async function correctWithGemini(
  ocrText: string,
  documentType: string
): Promise<CorrectionResult> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // 문서 유형에 맞는 프롬프트 선택
  const promptTemplate = PROMPTS[documentType] || PROMPTS['default'];
  const fullPrompt = promptTemplate + ocrText + FORMAT_INSTRUCTION;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // JSON 형식이 아닌 경우 텍스트만 반환
      return {
        text: ocrText,
        structuredData: null
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      text: parsed.correctedText || ocrText,
      structuredData: parsed.structuredData || null
    };
  } catch (error) {
    console.error('Gemini 처리 오류:', error);
    // 오류 시 원본 반환
    return {
      text: ocrText,
      structuredData: null
    };
  }
}

// 채권자 목록 데이터 추출을 위한 전문 함수
export async function extractCreditorData(ocrText: string): Promise<any[]> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
다음 텍스트에서 채권자(채무) 정보를 추출하여 JSON 배열로 반환해주세요.

각 채권자 정보는 다음 필드를 포함해야 합니다:
- 채권자명: string
- 채권자주소: string (있는 경우)
- 채권원인: string (예: 신용대출, 카드론, 주택담보대출 등)
- 원금: number
- 이자: number (계산된 이자 금액)
- 지연손해금: number (있는 경우)
- 총채권액: number
- 담보여부: boolean
- 담보내용: string (담보가 있는 경우)

텍스트:
${ocrText}

JSON 배열 형식으로만 응답해주세요: [{ ... }, { ... }]
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('채권자 데이터 추출 오류:', error);
    return [];
  }
}

// 재산 데이터 추출
export async function extractAssetData(ocrText: string, assetType: string): Promise<any[]> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
다음 텍스트에서 재산 정보를 추출하여 JSON 배열로 반환해주세요.
재산 유형: ${assetType}

각 재산 정보는 다음 필드를 포함해야 합니다:
- 종류: string (부동산/자동차/보험/예금/주식/가상자산/기타)
- 상세내용: string (구체적인 설명)
- 시가: number (현재 시장가치 추정액)
- 담보권설정액: number (있는 경우, 근저당 등)
- 청산가치: number (시가 - 담보권설정액 또는 환가예상액)

텍스트:
${ocrText}

JSON 배열 형식으로만 응답해주세요: [{ ... }, { ... }]
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('재산 데이터 추출 오류:', error);
    return [];
  }
}

// 소득 데이터 추출
export async function extractIncomeData(ocrText: string): Promise<any> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
다음 텍스트에서 소득 정보를 추출하여 JSON으로 반환해주세요.

다음 필드를 포함해야 합니다:
- 소득유형: string (급여/영업/연금/기타)
- 월수입: number (월 평균 수입)
- 상세내용: string (직장명, 사업내용 등)
- 세전금액: number (있는 경우)
- 세후금액: number (실수령액)

텍스트:
${ocrText}

JSON 형식으로만 응답해주세요.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('소득 데이터 추출 오류:', error);
    return null;
  }
}
