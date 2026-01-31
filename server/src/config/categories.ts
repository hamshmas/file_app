// 부산회생법원 자료제출목록 기준 서류 카테고리 정의

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  required: boolean;
  courtSpecific?: string[];  // 특정 법원에서만 필요한 경우
}

export interface SubcategoryInfo extends CategoryInfo {
  parentId: string;
  순번?: number;  // 법원 제출목록 순번
}

// 메인 카테고리
export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'personal_info',
    name: '인적 사항 및 주거 관련',
    description: '채무자의 신원 및 주거상황을 확인하는 서류',
    required: true
  },
  {
    id: 'creditor_list',
    name: '개인회생채권자목록 관련',
    description: '채무 현황을 확인하는 서류',
    required: true
  },
  {
    id: 'asset_list',
    name: '재산목록 관련',
    description: '채무자의 재산 현황을 확인하는 서류',
    required: true
  },
  {
    id: 'income_expense',
    name: '수입 및 지출 관련',
    description: '채무자의 수입과 지출을 확인하는 서류',
    required: true
  }
];

// 부산회생법원 서류 목록 (2025.9.1 시행)
export const BUSAN_SUBCATEGORIES: SubcategoryInfo[] = [
  // 인적 사항 및 주거 관련 (1-4번)
  {
    id: 'family_relation',
    parentId: 'personal_info',
    name: '가족관계증명서(상세증명서)',
    description: '채무자의 가족관계를 확인',
    required: true,
    순번: 1
  },
  {
    id: 'marriage_relation',
    parentId: 'personal_info',
    name: '혼인관계증명서(상세증명서)',
    description: '채무자의 혼인관계를 확인',
    required: true,
    순번: 2
  },
  {
    id: 'resident_registration',
    parentId: 'personal_info',
    name: '주민등록등본/초본',
    description: '과거 주소, 개명, 주민등록번호 변동사항 포함',
    required: true,
    순번: 3
  },
  {
    id: 'housing',
    parentId: 'personal_info',
    name: '현 주거사항에 관한 자료',
    description: '임대차계약서, 부동산등기사항전부증명서, 무상거주확인서 등',
    required: true,
    순번: 4
  },

  // 개인회생채권자목록 관련 (5번)
  {
    id: 'debt_certificate',
    parentId: 'creditor_list',
    name: '부채증명서',
    description: '채권자, 채권액, 채권 발생 원인에 관한 자료',
    required: true,
    순번: 5
  },
  {
    id: 'loan_contract',
    parentId: 'creditor_list',
    name: '차용증/공정증서',
    description: '개인간 채무 관련 자료',
    required: false
  },
  {
    id: 'court_judgment',
    parentId: 'creditor_list',
    name: '판결서',
    description: '소송 관련 채무 자료',
    required: false
  },

  // 재산목록 관련 (6-14번)
  {
    id: 'tax_certificate',
    parentId: 'asset_list',
    name: '지방세 세목별 과세증명서',
    description: '전체 관할지 / 전체 세목 / 최근 5년, 배우자 및 직계비속 포함',
    required: true,
    순번: 6
  },
  {
    id: 'land_registry',
    parentId: 'asset_list',
    name: '부동산 지적전산자료 조회결과서',
    description: '배우자 및 직계비속 포함',
    required: true,
    순번: 7
  },
  {
    id: 'real_estate',
    parentId: 'asset_list',
    name: '소유 부동산 등기사항전부증명서 및 시가 확인자료',
    description: '부동산 소유시 제출',
    required: false,
    순번: 8
  },
  {
    id: 'vehicle',
    parentId: 'asset_list',
    name: '자동차 등 등록대상 재산 등록원부 및 시가 확인자료',
    description: '자동차 소유시 제출',
    required: false,
    순번: 9
  },
  {
    id: 'bank_statement',
    parentId: 'asset_list',
    name: '은행 계좌거래내역서',
    description: '최근 1년간 모든 은행 계좌 또는 금융결제원 계좌정보통합관리서비스',
    required: true,
    순번: 10
  },
  {
    id: 'credit_card',
    parentId: 'asset_list',
    name: '신용카드 사용내역서',
    description: '최근 1년간',
    required: true,
    순번: 11
  },
  {
    id: 'insurance',
    parentId: 'asset_list',
    name: '보험가입내역 및 예상해약환급금 내역',
    description: '해약환급금이 없는 경우 보험회사 증명서',
    required: true,
    순번: 12
  },
  {
    id: 'money_claim',
    parentId: 'asset_list',
    name: '채무자가 보유한 금전채권에 관한 자료',
    description: '임대차보증금반환채권, 미수금, 대여금 등',
    required: false,
    순번: 13
  },
  {
    id: 'crypto_stock',
    parentId: 'asset_list',
    name: '가상자산, 주식 보유 현황 및 환가예상액',
    description: '투자활동을 하지 않은 경우에도 관련자료 제출',
    required: true,
    순번: 14
  },

  // 수입 및 지출 관련 (15-27번)
  {
    id: 'expense_plan',
    parentId: 'income_expense',
    name: '향후 생계비 지출계획',
    description: '배우자의 소득금액증명 포함',
    required: true,
    순번: 15
  },
  {
    id: 'health_insurance',
    parentId: 'income_expense',
    name: '건강보험자격득실확인서',
    description: '국민건강보험공단 발급',
    required: true,
    순번: 16
  },
  {
    id: 'pension',
    parentId: 'income_expense',
    name: '연금산정용 가입내역확인서',
    description: '국민연금공단 발급',
    required: true,
    순번: 16
  },
  {
    id: 'employment',
    parentId: 'income_expense',
    name: '급여소득에 관한 자료',
    description: '재직증명서, 근로계약서, 사용자 확인서 등 (급여소득자)',
    required: false,
    순번: 17
  },
  {
    id: 'salary',
    parentId: 'income_expense',
    name: '급여액에 관한 자료',
    description: '최근 2년간 급여 입금내역, 원천징수영수증, 급여증명서 등 (급여소득자)',
    required: false,
    순번: 18
  },
  {
    id: 'retirement',
    parentId: 'income_expense',
    name: '사용자가 작성한 예상퇴직금계산서',
    description: '근무기간 6개월 이상인 경우 (급여소득자)',
    required: false,
    순번: 19
  },
  {
    id: 'business_registration',
    parentId: 'income_expense',
    name: '사업자등록증명 및 총사업자등록내역 사실증명',
    description: '과거 및 현재 영업 전부 확인 (영업소득자)',
    required: false,
    순번: 20
  },
  {
    id: 'income_certificate',
    parentId: 'income_expense',
    name: '소득금액증명/부가가치세과세표준증명/표준재무제표증명',
    description: '최근 3년간 (영업소득자)',
    required: false,
    순번: 21
  },
  {
    id: 'sales_data',
    parentId: 'income_expense',
    name: '매출액에 관한 자료',
    description: '매출세금계산서합계표, 신용카드매출전표, 영업장부 등 (영업소득자)',
    required: false,
    순번: 22
  },
  {
    id: 'business_expense',
    parentId: 'income_expense',
    name: '영업지출에 관한 자료',
    description: '매입세금계산서합계표, 영수증, 근로계약서 등 (영업소득자)',
    required: false,
    순번: 23
  },
  {
    id: 'business_income',
    parentId: 'income_expense',
    name: '월 평균 영업소득에 관한 자료',
    description: '매출액, 영업지출을 반영한 영업소득 도표 (영업소득자)',
    required: false,
    순번: 24
  },
  {
    id: 'business_lease',
    parentId: 'income_expense',
    name: '사업장 임대차계약서 사본',
    description: '(영업소득자)',
    required: false,
    순번: 25
  },
  {
    id: 'business_asset',
    parentId: 'income_expense',
    name: '영업 시설 및 비품의 시가확인서',
    description: '사업장 내/외부사진 포함 (영업소득자)',
    required: false,
    순번: 26
  },
  {
    id: 'welfare',
    parentId: 'income_expense',
    name: '연금수급증명서, 기초생활수급자 증명서 등',
    description: '기타 수입원에 관한 자료',
    required: false,
    순번: 27
  },
  {
    id: 'credit_education',
    parentId: 'income_expense',
    name: '신용교육 이수증',
    description: '신용회복위원회 신용교육원에서 수료',
    required: true,
    순번: 28
  }
];

// 부산회생법원 추가질문사항 (17개 항목)
export const BUSAN_ADDITIONAL_QUESTIONS = [
  { 번호: 1, 질문: '실거주지가 주민등록상 주소지와 다른지' },
  { 번호: 2, 질문: '최근 1년 내 신규 채무 부담' },
  { 번호: 3, 질문: '최근 2년 내 부동산 등 재산 처분' },
  { 번호: 4, 질문: '최근 1년 내 200만 원 이상 계좌이체' },
  { 번호: 5, 질문: '최근 1년 내 100만 원 이상 현금인출' },
  { 번호: 6, 질문: '최근 1년 내 100만 원 이상 신용카드거래' },
  { 번호: 7, 질문: '최근 1년 내 보험계약 해지' },
  { 번호: 8, 질문: '최근 2년 내 고위험투자, 과소비, 도박' },
  { 번호: 9, 질문: '최근 2년 내 이혼' },
  { 번호: 10, 질문: '이혼에 따른 미성년자녀 양육비 부담' },
  { 번호: 11, 질문: '최근 1년 내 이직·퇴직·신규 취업' },
  { 번호: 12, 질문: '급여 등에 대한 압류' },
  { 번호: 13, 질문: '생계비 산정에 부양가족 포함' },
  { 번호: 14, 질문: '추가생계비(주거비, 의료비, 교육비) 포함' },
  { 번호: 15, 질문: '기준 중위소득 150% 초과' },
  { 번호: 16, 질문: '최근 2년 내 개인회생·파산 신청' },
  { 번호: 17, 질문: '신용교육 이수' }
];

// 카테고리 ID로 정보 조회
export function getCategoryById(id: string): CategoryInfo | undefined {
  return CATEGORIES.find(cat => cat.id === id);
}

// 서브카테고리 ID로 정보 조회
export function getSubcategoryById(id: string): SubcategoryInfo | undefined {
  return BUSAN_SUBCATEGORIES.find(sub => sub.id === id);
}

// 특정 카테고리의 서브카테고리 목록
export function getSubcategoriesByCategory(categoryId: string): SubcategoryInfo[] {
  return BUSAN_SUBCATEGORIES.filter(sub => sub.parentId === categoryId);
}
