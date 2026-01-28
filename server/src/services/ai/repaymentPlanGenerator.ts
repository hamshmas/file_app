import { ICase, ICreditor } from '../../models/Case';
import { generateCreditorList, CreditorListResult } from './creditorListGenerator';
import { generateAssetList, AssetListResult } from './assetListGenerator';
import { generateIncomeExpenseList, IncomeExpenseResult } from './incomeExpenseGenerator';

export interface RepaymentPlanResult {
  변제계획요약: RepaymentSummary;
  채권자별변제계획: CreditorRepaymentPlan[];
  변제일정표: RepaymentSchedule[];
  적격성검토: EligibilityCheck;
}

export interface RepaymentSummary {
  총채무액: number;
  담보채무액: number;
  무담보채무액: number;
  청산가치: number;
  월가용소득: number;
  월회생위원보수: number;
  월실제가용소득: number;
  변제기간개월: number;
  총변제금액: number;
  변제율: number;
  월변제금액: number;
  최저변제금액: number;
  // 현재가치 관련
  현재가치: number;
  라이프니쯔계수: number;
  청산가치보장여부: boolean;
  재산처분필요여부: boolean;
  재산처분변제투입예정액: number;
}

export interface CreditorRepaymentPlan {
  순번: number;
  채권자명: string;
  원채권액: number;
  변제비율: number;
  변제금액: number;
  월변제금액: number;
  담보여부: boolean;
}

export interface RepaymentSchedule {
  회차: number;
  변제일: string;
  변제금액: number;
  누적변제금액: number;
}

export interface EligibilityCheck {
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  recommendations: string[];
}

// 기본 변제기간 (개월)
const DEFAULT_REPAYMENT_PERIOD = 36;
const MAX_REPAYMENT_PERIOD = 60;

// 최저변제율 (5%)
const MIN_REPAYMENT_RATE = 0.05;

// 현재가치 할인율 (서울회생법원 기준: 연 5%)
const ANNUAL_DISCOUNT_RATE = 0.05;
const MONTHLY_DISCOUNT_RATE = ANNUAL_DISCOUNT_RATE / 12;

// 기본 적립기간 (개인회생절차개시신청 ~ 변제계획인가까지 약 3개월)
const DEFAULT_ACCUMULATION_PERIOD = 3;

// 회생위원 보수율 (가용소득의 1%)
const REHABILITATION_COMMISSIONER_FEE_RATE = 0.01;

// 급여소득자 채무기준 (2억원 이하시 법원사무관 담당 = 보수 0원)
const SALARY_EARNER_DEBT_THRESHOLD = 200000000;

/**
 * 회생위원 보수 계산
 * 서울회생법원 기준:
 * - 급여소득자이고 채무가 2억원 이하인 경우: 법원사무관 담당 = 0원
 * - 그 외: 월 가용소득의 1%
 *
 * @param monthlyAvailableIncome - 월 가용소득
 * @param totalDebt - 총채무액
 * @param isSalaryEarner - 급여소득자 여부
 * @returns 월 회생위원 보수
 */
export function calculateCommissionerFee(
  monthlyAvailableIncome: number,
  totalDebt: number,
  isSalaryEarner: boolean
): number {
  // 급여소득자이고 채무가 2억원 이하인 경우 법원사무관 담당 (보수 0원)
  if (isSalaryEarner && totalDebt <= SALARY_EARNER_DEBT_THRESHOLD) {
    return 0;
  }

  // 그 외: 가용소득의 1%
  return Math.ceil(monthlyAvailableIncome * REHABILITATION_COMMISSIONER_FEE_RATE);
}

/**
 * 라이프니쯔 복리연금현가율 계산
 * 서울회생법원 기준: 연 5% 할인율 적용
 *
 * @param months - 변제기간(개월)
 * @returns 복리연금현가율
 */
export function calculateLeibinzAnnuityFactor(months: number): number {
  if (months <= 0) return 0;

  // 복리연금현가율 = (1 - (1 + r)^(-n)) / r
  const factor = (1 - Math.pow(1 + MONTHLY_DISCOUNT_RATE, -months)) / MONTHLY_DISCOUNT_RATE;
  return Math.round(factor * 10000) / 10000; // 소수점 4자리
}

/**
 * 총변제예정액의 현재가치 계산
 * 서울회생법원 기준: 적립기간(3개월) + 변제투입기간(33개월)의 라이프니쯔 현가율
 *
 * 36개월 변제계획 기준: 월 변제예정액 × 33.7719
 * - 33.7719 = 3(적립기간) + 30.7719(33개월 라이프니쯔 복리연금현가율)
 *
 * @param monthlyPayment - 월 변제예정(유보)액
 * @param repaymentPeriod - 변제기간(개월)
 * @param accumulationPeriod - 적립기간(개월), 기본값 3
 * @returns 현재가치
 */
export function calculatePresentValue(
  monthlyPayment: number,
  repaymentPeriod: number,
  accumulationPeriod: number = DEFAULT_ACCUMULATION_PERIOD
): number {
  // 변제투입기간 = 변제기간 - 적립기간
  const investmentPeriod = repaymentPeriod - accumulationPeriod;

  // 라이프니쯔 복리연금현가율 계산
  const leibinzFactor = calculateLeibinzAnnuityFactor(investmentPeriod);

  // 현재가치 계산
  // = (적립기간 × 월변제액) + (라이프니쯔현가율 × 월변제액)
  // = 월변제액 × (적립기간 + 라이프니쯔현가율)
  const totalFactor = accumulationPeriod + leibinzFactor;
  const presentValue = Math.floor(monthlyPayment * totalFactor); // 원 미만 버림

  return presentValue;
}

/**
 * 청산가치 보장 여부 확인
 * 총변제예정액의 현재가치 >= 청산가치 이어야 함
 *
 * @param presentValue - 총변제예정액의 현재가치
 * @param liquidationValue - 청산가치
 * @returns 청산가치 보장 여부
 */
export function checkLiquidationValueGuarantee(
  presentValue: number,
  liquidationValue: number
): { guaranteed: boolean; shortfall: number } {
  const shortfall = liquidationValue - presentValue;
  return {
    guaranteed: presentValue >= liquidationValue,
    shortfall: shortfall > 0 ? shortfall : 0
  };
}

/**
 * 재산처분 변제투입예정액 계산
 * 청산가치가 현재가치보다 큰 경우 재산처분이 필요
 *
 * @param liquidationValue - 청산가치
 * @param presentValue - 가용소득에 의한 현재가치
 * @param disposalPeriodYears - 재산처분 기한 (1년 또는 2년)
 * @returns 변제투입예정액
 */
export function calculateAssetDisposalAmount(
  liquidationValue: number,
  presentValue: number,
  disposalPeriodYears: 1 | 2 = 1
): number {
  if (presentValue >= liquidationValue) {
    return 0; // 재산처분 불필요
  }

  const shortfall = liquidationValue - presentValue;

  // 배수: 1년 내 처분 시 1.3, 2년 내 처분 시 1.5
  const multiplier = disposalPeriodYears === 1 ? 1.3 : 1.5;

  // 변제투입예정액 = (청산가치 - 현재가치) × 배수
  const disposalAmount = Math.ceil(shortfall * multiplier); // 원 미만 올림

  return disposalAmount;
}

/**
 * 변제기간별 라이프니쯔 현가계수 조회표 생성
 * 36개월 ~ 60개월
 */
export function getLeibinzFactorTable(): Record<number, number> {
  const table: Record<number, number> = {};

  for (let months = 36; months <= 60; months++) {
    const investmentPeriod = months - DEFAULT_ACCUMULATION_PERIOD;
    const factor = calculateLeibinzAnnuityFactor(investmentPeriod);
    table[months] = DEFAULT_ACCUMULATION_PERIOD + factor;
  }

  return table;
}

// 참고: 서울회생법원 기준 주요 현가계수
// 36개월: 33.7719 (3 + 30.7719)
// 48개월: 44.5656 (3 + 41.5656)
// 60개월: 55.0764 (3 + 52.0764)

// 변제계획안 생성
export async function generateRepaymentPlan(caseData: ICase): Promise<RepaymentPlanResult> {
  // 각 목록 생성
  const creditorList = await generateCreditorList(caseData);
  const assetList = await generateAssetList(caseData);
  const incomeExpense = await generateIncomeExpenseList(caseData);

  // 변제계획 요약 계산
  const summary = calculateRepaymentSummary(
    creditorList,
    assetList,
    incomeExpense,
    DEFAULT_REPAYMENT_PERIOD
  );

  // 채권자별 변제계획 생성
  const creditorPlans = generateCreditorRepaymentPlans(
    creditorList,
    summary.총변제금액,
    summary.변제기간개월
  );

  // 변제일정표 생성
  const schedule = generateRepaymentSchedule(
    summary.월변제금액,
    summary.변제기간개월
  );

  // 적격성 검토
  const eligibility = checkEligibility(
    creditorList,
    assetList,
    incomeExpense,
    summary
  );

  return {
    변제계획요약: summary,
    채권자별변제계획: creditorPlans,
    변제일정표: schedule,
    적격성검토: eligibility
  };
}

// 변제계획 요약 계산
function calculateRepaymentSummary(
  creditorList: CreditorListResult,
  assetList: AssetListResult,
  incomeExpense: IncomeExpenseResult,
  repaymentPeriod: number
): RepaymentSummary {
  const 총채무액 = creditorList.총채무액;
  const 담보채무액 = creditorList.담보채권액;
  const 무담보채무액 = creditorList.무담보채권액;
  const 청산가치 = assetList.청산가치;
  const 월가용소득 = incomeExpense.가용소득;

  // 급여소득자 여부 확인 (급여소득이 주요 소득원인 경우)
  const isSalaryEarner = incomeExpense.수입상세.급여소득 > 0 &&
    incomeExpense.수입상세.급여소득 >= incomeExpense.월평균수입 * 0.5;

  // 회생위원 보수 계산
  const 월회생위원보수 = calculateCommissionerFee(월가용소득, 총채무액, isSalaryEarner);

  // 실제 가용소득 (회생위원 보수 공제 후)
  const 월실제가용소득 = 월가용소득 - 월회생위원보수;

  // 총 변제금액 = 실제가용소득 × 변제기간
  let 총변제금액 = 월실제가용소득 * repaymentPeriod;

  // 최저변제금액 (무담보채권의 5%)
  const 최저변제금액 = 무담보채무액 * MIN_REPAYMENT_RATE;

  // 월 변제금액 (회생위원 보수 공제 후)
  const 월변제금액 = Math.ceil(월실제가용소득);

  // 라이프니쯔 현가계수 계산 (적립기간 포함)
  const 변제투입기간 = repaymentPeriod - DEFAULT_ACCUMULATION_PERIOD;
  const 라이프니쯔계수 = DEFAULT_ACCUMULATION_PERIOD + calculateLeibinzAnnuityFactor(변제투입기간);

  // 현재가치 계산
  const 현재가치 = calculatePresentValue(월변제금액, repaymentPeriod);

  // 청산가치 보장 여부 확인
  const liquidationCheck = checkLiquidationValueGuarantee(현재가치, 청산가치);
  const 청산가치보장여부 = liquidationCheck.guaranteed;

  // 재산처분 필요 여부 및 투입예정액 계산
  let 재산처분필요여부 = false;
  let 재산처분변제투입예정액 = 0;

  if (!청산가치보장여부) {
    재산처분필요여부 = true;
    // 1년 내 처분 기준으로 계산 (기본값)
    재산처분변제투입예정액 = calculateAssetDisposalAmount(청산가치, 현재가치, 1);
    // 재산처분으로 청산가치 보장
    총변제금액 += 재산처분변제투입예정액;
  }

  // 변제율 계산
  const 변제율 = 무담보채무액 > 0 ? (총변제금액 / 무담보채무액) : 0;

  return {
    총채무액,
    담보채무액,
    무담보채무액,
    청산가치,
    월가용소득,
    월회생위원보수,
    월실제가용소득,
    변제기간개월: repaymentPeriod,
    총변제금액,
    변제율: Math.round(변제율 * 10000) / 100, // 소수점 2자리 퍼센트
    월변제금액,
    최저변제금액,
    현재가치,
    라이프니쯔계수,
    청산가치보장여부,
    재산처분필요여부,
    재산처분변제투입예정액
  };
}

// 채권자별 변제계획 생성
function generateCreditorRepaymentPlans(
  creditorList: CreditorListResult,
  totalRepayment: number,
  repaymentPeriod: number
): CreditorRepaymentPlan[] {
  const { 채권자목록, 총채무액, 담보채권액 } = creditorList;

  // 담보채권과 무담보채권 분리
  const 담보채권자 = 채권자목록.filter(c => c.담보여부);
  const 무담보채권자 = 채권자목록.filter(c => !c.담보여부);

  // 무담보채권 총액
  const 무담보총액 = 무담보채권자.reduce((sum, c) => sum + c.총채권액, 0);

  // 담보채권은 별도 변제 (개인회생에서는 통상 계속 변제)
  // 무담보채권은 비례 배분

  const plans: CreditorRepaymentPlan[] = [];

  // 담보채권자 변제계획
  담보채권자.forEach((creditor, index) => {
    plans.push({
      순번: index + 1,
      채권자명: creditor.채권자명,
      원채권액: creditor.총채권액,
      변제비율: 100, // 담보채권은 100% 변제 (별도)
      변제금액: creditor.총채권액,
      월변제금액: Math.ceil(creditor.총채권액 / repaymentPeriod),
      담보여부: true
    });
  });

  // 무담보채권자 변제계획 (비례 배분)
  무담보채권자.forEach((creditor, index) => {
    const ratio = 무담보총액 > 0 ? creditor.총채권액 / 무담보총액 : 0;
    const 변제금액 = Math.round(totalRepayment * ratio);
    const 변제비율 = creditor.총채권액 > 0 ? (변제금액 / creditor.총채권액) * 100 : 0;

    plans.push({
      순번: 담보채권자.length + index + 1,
      채권자명: creditor.채권자명,
      원채권액: creditor.총채권액,
      변제비율: Math.round(변제비율 * 100) / 100,
      변제금액,
      월변제금액: Math.ceil(변제금액 / repaymentPeriod),
      담보여부: false
    });
  });

  return plans;
}

// 변제일정표 생성
function generateRepaymentSchedule(
  monthlyPayment: number,
  repaymentPeriod: number
): RepaymentSchedule[] {
  const schedule: RepaymentSchedule[] = [];
  let cumulativePayment = 0;

  // 변제 시작일 (익월 말일 기준)
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() + 2);
  startDate.setDate(0); // 말일로 설정

  for (let i = 1; i <= repaymentPeriod; i++) {
    cumulativePayment += monthlyPayment;

    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i - 1);

    schedule.push({
      회차: i,
      변제일: formatDate(paymentDate),
      변제금액: monthlyPayment,
      누적변제금액: cumulativePayment
    });
  }

  return schedule;
}

// 날짜 포맷
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

// 적격성 검토
function checkEligibility(
  creditorList: CreditorListResult,
  assetList: AssetListResult,
  incomeExpense: IncomeExpenseResult,
  summary: RepaymentSummary
): EligibilityCheck {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let eligible = true;

  // 1. 무담보채무 상한 확인 (10억원)
  if (creditorList.무담보채권액 > 1000000000) {
    eligible = false;
    reasons.push('무담보채무가 10억원을 초과합니다.');
  }

  // 2. 담보채무 상한 확인 (15억원)
  if (creditorList.담보채권액 > 1500000000) {
    eligible = false;
    reasons.push('담보채무가 15억원을 초과합니다.');
  }

  // 3. 총채무 상한 확인 (10억원 + 15억원)
  if (creditorList.총채무액 > 2500000000) {
    eligible = false;
    reasons.push('총채무가 25억원을 초과합니다.');
  }

  // 4. 가용소득 확인
  if (incomeExpense.가용소득 <= 0) {
    eligible = false;
    reasons.push('가용소득이 없거나 음수입니다.');
    recommendations.push('지출을 줄이거나 추가 소득원을 확보해야 합니다.');
  }

  // 5. 최저변제금액 충족 여부
  if (summary.총변제금액 < summary.최저변제금액) {
    warnings.push(`총변제금액(${summary.총변제금액.toLocaleString()}원)이 최저변제금액(${summary.최저변제금액.toLocaleString()}원)에 미달합니다.`);
    recommendations.push('변제기간 연장(최대 60개월)을 검토하세요.');
  }

  // 6. 청산가치 보장 확인 (현재가치 기준)
  if (!summary.청산가치보장여부) {
    if (summary.재산처분필요여부) {
      warnings.push(`현재가치(${summary.현재가치.toLocaleString()}원)가 청산가치(${summary.청산가치.toLocaleString()}원)에 미달합니다.`);
      warnings.push(`재산처분 변제투입예정액: ${summary.재산처분변제투입예정액.toLocaleString()}원`);
      recommendations.push('재산처분 계획을 수립하고 D5111 양식을 사용하세요.');
    } else {
      warnings.push('변제금액이 청산가치에 미달합니다.');
      recommendations.push('변제기간 연장 또는 재산 처분을 검토하세요.');
    }
  }

  // 7. 변제율 확인
  if (summary.변제율 < 5) {
    warnings.push(`변제율이 ${summary.변제율}%로 매우 낮습니다.`);
  }

  // 8. 정기적 수입 확인
  if (incomeExpense.월평균수입 === 0) {
    eligible = false;
    reasons.push('정기적인 수입이 확인되지 않습니다.');
    recommendations.push('고용계약서, 사업자등록증 등 수입증빙 서류를 제출하세요.');
  }

  return {
    eligible,
    reasons,
    warnings,
    recommendations
  };
}

// 변제기간 최적화 (청산가치 보장 및 최저변제금액 충족)
export function optimizeRepaymentPeriod(
  monthlyAvailableIncome: number,
  liquidationValue: number,
  minRepaymentAmount: number
): number {
  // 청산가치 보장을 위한 최소 기간
  const periodForLiquidation = Math.ceil(liquidationValue / monthlyAvailableIncome);

  // 최저변제금액 충족을 위한 최소 기간
  const periodForMinRepayment = Math.ceil(minRepaymentAmount / monthlyAvailableIncome);

  // 둘 중 큰 값 선택, 단 36~60개월 범위 내
  let optimalPeriod = Math.max(periodForLiquidation, periodForMinRepayment);
  optimalPeriod = Math.max(DEFAULT_REPAYMENT_PERIOD, optimalPeriod);
  optimalPeriod = Math.min(MAX_REPAYMENT_PERIOD, optimalPeriod);

  return optimalPeriod;
}
