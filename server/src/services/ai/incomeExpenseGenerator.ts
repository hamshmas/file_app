import { ICase, IIncome, IExpense } from '../../models/Case';

export interface IncomeExpenseResult {
  수입목록: ProcessedIncome[];
  지출목록: ProcessedExpense[];
  월평균수입: number;
  월평균지출: number;
  가용소득: number;
  수입상세: IncomeDetail;
  지출상세: ExpenseDetail;
}

export interface ProcessedIncome {
  순번: number;
  소득유형: string;
  소득원: string;
  월소득액: number;
  연소득액: number;
  비고: string;
}

export interface ProcessedExpense {
  순번: number;
  지출항목: string;
  월지출액: number;
  비고: string;
}

export interface IncomeDetail {
  급여소득: number;
  영업소득: number;
  연금소득: number;
  임대소득: number;
  기타소득: number;
  배우자소득: number;
}

export interface ExpenseDetail {
  주거비: number;
  식비: number;
  교통비: number;
  통신비: number;
  의료비: number;
  교육비: number;
  보험료: number;
  기타생계비: number;
}

// 2026년 기준 중위소득 (1인~6인 가구) - 보건복지부 고시
const MEDIAN_INCOME_2026: Record<number, number> = {
  1: 2564238,
  2: 4199292,
  3: 5359036,
  4: 6494738,
  5: 7556719,
  6: 8555952
};

// 기준 생계비 (중위소득의 60%) - 개인회생 생계비 기준
export function getStandardLivingExpense(familySize: number): number {
  const size = Math.min(Math.max(familySize, 1), 6);
  return Math.round(MEDIAN_INCOME_2026[size] * 0.6);
}

// 기준 생계비 60% 직접 조회 (가구별)
export function getStandardLivingExpense60(familySize: number): number {
  const LIVING_EXPENSE_60: Record<number, number> = {
    1: 1538543,
    2: 2519575,
    3: 3215422,
    4: 3896843,
    5: 4534031,
    6: 5133571
  };
  const size = Math.min(Math.max(familySize, 1), 6);
  return LIVING_EXPENSE_60[size];
}

// 최대 생계비 (중위소득의 150%)
export function getMaxLivingExpense(familySize: number): number {
  const size = Math.min(Math.max(familySize, 1), 6);
  return Math.round(MEDIAN_INCOME_2026[size] * 1.5);
}

// 수입 및 지출 목록 생성
export async function generateIncomeExpenseList(caseData: ICase): Promise<IncomeExpenseResult> {
  const incomes = caseData.extractedData?.income || [];
  const expenses = caseData.extractedData?.expenses || [];

  // 수입 처리
  const processedIncomes: ProcessedIncome[] = incomes.map((income, index) => {
    const 월소득액 = income.월소득액 || 0;
    return {
      순번: index + 1,
      소득유형: income.소득유형 || '기타',
      소득원: income.소득원 || '',
      월소득액,
      연소득액: 월소득액 * 12,
      비고: income.비고 || ''
    };
  });

  // 지출 처리
  const processedExpenses: ProcessedExpense[] = expenses.map((expense, index) => ({
    순번: index + 1,
    지출항목: expense.지출항목 || '기타',
    월지출액: expense.월지출액 || 0,
    비고: expense.비고 || ''
  }));

  // 수입 상세 계산
  const 수입상세: IncomeDetail = {
    급여소득: processedIncomes
      .filter(i => i.소득유형 === '급여')
      .reduce((sum, i) => sum + i.월소득액, 0),
    영업소득: processedIncomes
      .filter(i => i.소득유형 === '영업')
      .reduce((sum, i) => sum + i.월소득액, 0),
    연금소득: processedIncomes
      .filter(i => i.소득유형 === '연금')
      .reduce((sum, i) => sum + i.월소득액, 0),
    임대소득: processedIncomes
      .filter(i => i.소득유형 === '임대')
      .reduce((sum, i) => sum + i.월소득액, 0),
    기타소득: processedIncomes
      .filter(i => !['급여', '영업', '연금', '임대', '배우자'].includes(i.소득유형))
      .reduce((sum, i) => sum + i.월소득액, 0),
    배우자소득: processedIncomes
      .filter(i => i.소득유형 === '배우자')
      .reduce((sum, i) => sum + i.월소득액, 0)
  };

  // 지출 상세 계산
  const 지출상세: ExpenseDetail = {
    주거비: processedExpenses
      .filter(e => e.지출항목 === '주거비')
      .reduce((sum, e) => sum + e.월지출액, 0),
    식비: processedExpenses
      .filter(e => e.지출항목 === '식비')
      .reduce((sum, e) => sum + e.월지출액, 0),
    교통비: processedExpenses
      .filter(e => e.지출항목 === '교통비')
      .reduce((sum, e) => sum + e.월지출액, 0),
    통신비: processedExpenses
      .filter(e => e.지출항목 === '통신비')
      .reduce((sum, e) => sum + e.월지출액, 0),
    의료비: processedExpenses
      .filter(e => e.지출항목 === '의료비')
      .reduce((sum, e) => sum + e.월지출액, 0),
    교육비: processedExpenses
      .filter(e => e.지출항목 === '교육비')
      .reduce((sum, e) => sum + e.월지출액, 0),
    보험료: processedExpenses
      .filter(e => e.지출항목 === '보험료')
      .reduce((sum, e) => sum + e.월지출액, 0),
    기타생계비: processedExpenses
      .filter(e => !['주거비', '식비', '교통비', '통신비', '의료비', '교육비', '보험료'].includes(e.지출항목))
      .reduce((sum, e) => sum + e.월지출액, 0)
  };

  // 총계 계산
  const 월평균수입 = processedIncomes.reduce((sum, i) => sum + i.월소득액, 0);
  const 월평균지출 = processedExpenses.reduce((sum, e) => sum + e.월지출액, 0);
  const 가용소득 = 월평균수입 - 월평균지출;

  return {
    수입목록: processedIncomes,
    지출목록: processedExpenses,
    월평균수입,
    월평균지출,
    가용소득,
    수입상세,
    지출상세
  };
}

// 급여소득자 월 평균 소득 계산
export function calculateAverageSalary(salaryData: number[]): number {
  if (salaryData.length === 0) return 0;
  const sum = salaryData.reduce((a, b) => a + b, 0);
  return Math.round(sum / salaryData.length);
}

// 영업소득자 월 평균 소득 계산
export function calculateAverageBusinessIncome(
  monthlyRevenue: number[],
  monthlyExpenses: number[]
): number {
  if (monthlyRevenue.length === 0) return 0;

  const avgRevenue = monthlyRevenue.reduce((a, b) => a + b, 0) / monthlyRevenue.length;
  const avgExpense = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length
    : 0;

  return Math.round(avgRevenue - avgExpense);
}

// 생계비 적정성 검토
export function validateLivingExpense(
  familySize: number,
  requestedExpense: number
): { valid: boolean; message: string; standardExpense: number; maxExpense: number } {
  const standardExpense = getStandardLivingExpense(familySize);
  const maxExpense = getMaxLivingExpense(familySize);

  if (requestedExpense <= standardExpense) {
    return {
      valid: true,
      message: '생계비가 기준 범위 내입니다.',
      standardExpense,
      maxExpense
    };
  } else if (requestedExpense <= maxExpense) {
    return {
      valid: true,
      message: '생계비가 기준을 초과하여 소명자료가 필요할 수 있습니다.',
      standardExpense,
      maxExpense
    };
  } else {
    return {
      valid: false,
      message: '생계비가 중위소득 150%를 초과합니다. 조정이 필요합니다.',
      standardExpense,
      maxExpense
    };
  }
}

// 중위소득 조회 (가구원 수 기준)
export function getMedianIncome(familySize: number): number {
  const size = Math.min(Math.max(familySize, 1), 6);
  return MEDIAN_INCOME_2026[size];
}

// 중위소득 150% 조회 (최대 생계비 기준)
export function getMedianIncome150(familySize: number): number {
  return getMaxLivingExpense(familySize);
}

// 가용소득 계산 (수입 - 생계비)
export function calculateAvailableIncome(
  monthlyIncome: number,
  livingExpense: number
): number {
  const available = monthlyIncome - livingExpense;
  return Math.max(available, 0);
}

// 권장 생계비 계산 (법원별 기준 적용)
export interface RecommendedLivingExpenseResult {
  기본생계비: number;
  최대인정생계비: number;
  권장생계비: number;
  사유: string;
}

export function calculateRecommendedLivingExpense(
  familySize: number,
  additionalExpenses?: {
    주거비?: number;
    의료비?: number;
    교육비?: number;
  }
): RecommendedLivingExpenseResult {
  const standardExpense = getStandardLivingExpense60(familySize);
  const maxExpense = getMaxLivingExpense(familySize);

  // 기본 생계비 (중위소득 60%)
  let recommendedExpense = standardExpense;
  let reason = '기준 중위소득 60% 적용';

  // 추가생계비가 있는 경우 합산
  if (additionalExpenses) {
    const additionalTotal =
      (additionalExpenses.주거비 || 0) +
      (additionalExpenses.의료비 || 0) +
      (additionalExpenses.교육비 || 0);

    if (additionalTotal > 0) {
      recommendedExpense = standardExpense + additionalTotal;
      reason = '기본생계비 + 추가생계비 (주거비/의료비/교육비)';

      // 최대 인정 한도 초과 시 조정
      if (recommendedExpense > maxExpense) {
        recommendedExpense = maxExpense;
        reason = '중위소득 150% 상한 적용';
      }
    }
  }

  return {
    기본생계비: standardExpense,
    최대인정생계비: maxExpense,
    권장생계비: recommendedExpense,
    사유: reason
  };
}
