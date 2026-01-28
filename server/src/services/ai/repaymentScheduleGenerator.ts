/**
 * 변제예정액표 생성 모듈
 *
 * 서울회생법원 가이드 기준:
 * - 적립기간 (3개월): 개시결정 ~ 변제계획인가
 * - 변제투입기간: 인가 후 변제 시작
 * - 월별 변제금액 상세 일정표 생성
 */

import {
  calculateLeibinzAnnuityFactor,
  calculatePresentValue
} from './repaymentPlanGenerator';

export interface RepaymentScheduleEntry {
  회차: number;
  연도: number;
  월: number;
  변제일: string;
  유보액: number;           // 적립기간 중 유보금
  변제금액: number;         // 실제 변제 금액
  회생위원보수: number;     // 회생위원 보수
  누적변제금액: number;
  현재가치: number;         // 해당 회차까지의 현재가치
  비고: string;
}

export interface CreditorScheduleEntry {
  회차: number;
  변제일: string;
  채권자별변제금액: Record<string, number>;  // 채권자명: 변제금액
  합계: number;
}

export interface RepaymentScheduleResult {
  요약: {
    변제기간개월: number;
    적립기간개월: number;
    변제투입기간개월: number;
    월변제금액: number;
    월회생위원보수: number;
    총변제금액: number;
    총현재가치: number;
    라이프니쯔계수: number;
    변제시작일: string;
    변제종료일: string;
  };
  월별일정: RepaymentScheduleEntry[];
  채권자별일정: CreditorScheduleEntry[];
}

// 기본 적립기간 (개월)
const DEFAULT_ACCUMULATION_PERIOD = 3;

// 변제일 계산 (매월 말일 기준)
function getLastDayOfMonth(year: number, month: number): Date {
  // month는 1-12 기준
  return new Date(year, month, 0);
}

// 날짜 포맷 (YYYY.MM.DD)
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

// 다음 달 계산
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * 변제예정액표 생성
 *
 * @param startDate - 개시결정예정일 (또는 신청일)
 * @param monthlyAvailableIncome - 월 가용소득
 * @param commissionerFee - 월 회생위원 보수
 * @param repaymentPeriod - 변제기간 (개월)
 * @param accumulationPeriod - 적립기간 (개월), 기본값 3
 * @param creditors - 채권자 목록 [{채권자명, 채권액, 비율}]
 */
export function generateRepaymentSchedule(
  startDate: Date,
  monthlyAvailableIncome: number,
  commissionerFee: number,
  repaymentPeriod: number,
  accumulationPeriod: number = DEFAULT_ACCUMULATION_PERIOD,
  creditors?: Array<{ 채권자명: string; 채권액: number; 비율: number }>
): RepaymentScheduleResult {
  const schedule: RepaymentScheduleEntry[] = [];
  const creditorSchedule: CreditorScheduleEntry[] = [];

  // 실제 월 변제금액 (회생위원 보수 공제 후)
  const monthlyPayment = monthlyAvailableIncome - commissionerFee;

  // 변제투입기간
  const investmentPeriod = repaymentPeriod - accumulationPeriod;

  // 라이프니쯔 계수 계산
  const leibnizFactor = calculateLeibinzAnnuityFactor(investmentPeriod);
  const totalFactor = accumulationPeriod + leibnizFactor;

  // 총변제금액 및 현재가치
  const totalRepayment = monthlyPayment * repaymentPeriod;
  const totalPresentValue = calculatePresentValue(monthlyPayment, repaymentPeriod, accumulationPeriod);

  // 변제 시작일 계산 (개시결정일 + 1개월 말일)
  const paymentStartDate = addMonths(startDate, 1);
  paymentStartDate.setDate(0); // 말일로 설정

  // 누적 변제금액
  let cumulativePayment = 0;
  let cumulativePresentValue = 0;

  // 월별 현가계수 (월 단위 할인율)
  const monthlyDiscountRate = 0.05 / 12;

  for (let i = 1; i <= repaymentPeriod; i++) {
    const paymentDate = getLastDayOfMonth(
      paymentStartDate.getFullYear(),
      paymentStartDate.getMonth() + i
    );

    const isAccumulationPeriod = i <= accumulationPeriod;

    // 유보액 (적립기간 중)과 변제금액
    const reserveAmount = isAccumulationPeriod ? monthlyPayment : 0;
    const paymentAmount = isAccumulationPeriod ? 0 : monthlyPayment;

    // 누적 변제금액
    cumulativePayment += monthlyPayment;

    // 현재가치 계산 (각 회차별)
    // 적립기간은 현재가치 그대로, 변제투입기간은 할인
    let presentValueThisMonth: number;
    if (isAccumulationPeriod) {
      presentValueThisMonth = monthlyPayment;
    } else {
      // 변제투입기간의 현재가치 (할인 적용)
      const monthsFromApproval = i - accumulationPeriod;
      presentValueThisMonth = Math.floor(
        monthlyPayment / Math.pow(1 + monthlyDiscountRate, monthsFromApproval)
      );
    }
    cumulativePresentValue += presentValueThisMonth;

    // 비고 작성
    let note = '';
    if (i === 1) {
      note = '적립기간 시작';
    } else if (i === accumulationPeriod) {
      note = '적립기간 종료 (인가 예정)';
    } else if (i === accumulationPeriod + 1) {
      note = '변제 시작';
    } else if (i === repaymentPeriod) {
      note = '변제 완료';
    }

    schedule.push({
      회차: i,
      연도: paymentDate.getFullYear(),
      월: paymentDate.getMonth() + 1,
      변제일: formatDate(paymentDate),
      유보액: reserveAmount,
      변제금액: paymentAmount,
      회생위원보수: commissionerFee,
      누적변제금액: cumulativePayment,
      현재가치: cumulativePresentValue,
      비고: note
    });

    // 채권자별 일정 (변제투입기간만)
    if (!isAccumulationPeriod && creditors && creditors.length > 0) {
      const creditorPayments: Record<string, number> = {};
      let total = 0;

      creditors.forEach(creditor => {
        const amount = Math.round(monthlyPayment * (creditor.비율 / 100));
        creditorPayments[creditor.채권자명] = amount;
        total += amount;
      });

      creditorSchedule.push({
        회차: i,
        변제일: formatDate(paymentDate),
        채권자별변제금액: creditorPayments,
        합계: total
      });
    }
  }

  // 변제종료일
  const endDate = getLastDayOfMonth(
    paymentStartDate.getFullYear(),
    paymentStartDate.getMonth() + repaymentPeriod
  );

  return {
    요약: {
      변제기간개월: repaymentPeriod,
      적립기간개월: accumulationPeriod,
      변제투입기간개월: investmentPeriod,
      월변제금액: monthlyPayment,
      월회생위원보수: commissionerFee,
      총변제금액: totalRepayment,
      총현재가치: totalPresentValue,
      라이프니쯔계수: Math.round(totalFactor * 10000) / 10000,
      변제시작일: formatDate(paymentStartDate),
      변제종료일: formatDate(endDate)
    },
    월별일정: schedule,
    채권자별일정: creditorSchedule
  };
}

/**
 * 적립기간 유보금액 총계 계산
 */
export function calculateAccumulationReserve(
  monthlyPayment: number,
  accumulationPeriod: number = DEFAULT_ACCUMULATION_PERIOD
): number {
  return monthlyPayment * accumulationPeriod;
}

/**
 * 분기별 변제일정 요약 생성
 * (서울회생법원 양식에 맞게 3개월 단위로 요약)
 */
export interface QuarterlyScheduleEntry {
  분기: number;
  시작월: string;
  종료월: string;
  분기변제금액: number;
  누적변제금액: number;
}

export function generateQuarterlySchedule(
  schedule: RepaymentScheduleEntry[]
): QuarterlyScheduleEntry[] {
  const quarterlySchedule: QuarterlyScheduleEntry[] = [];

  let quarter = 1;
  let quarterlyAmount = 0;
  let cumulativeAmount = 0;
  let startMonth = '';

  schedule.forEach((entry, index) => {
    if ((index) % 3 === 0) {
      // 분기 시작
      startMonth = entry.변제일;
      quarterlyAmount = 0;
    }

    quarterlyAmount += entry.변제금액 + entry.유보액;
    cumulativeAmount = entry.누적변제금액;

    if ((index + 1) % 3 === 0 || index === schedule.length - 1) {
      // 분기 종료
      quarterlySchedule.push({
        분기: quarter,
        시작월: startMonth,
        종료월: entry.변제일,
        분기변제금액: quarterlyAmount,
        누적변제금액: cumulativeAmount
      });
      quarter++;
    }
  });

  return quarterlySchedule;
}

/**
 * 연도별 변제일정 요약 생성
 */
export interface YearlyScheduleEntry {
  연도: number;
  연간변제금액: number;
  누적변제금액: number;
  현재가치: number;
}

export function generateYearlySchedule(
  schedule: RepaymentScheduleEntry[]
): YearlyScheduleEntry[] {
  const yearlyMap = new Map<number, { amount: number; presentValue: number }>();

  schedule.forEach(entry => {
    const year = entry.연도;
    const current = yearlyMap.get(year) || { amount: 0, presentValue: 0 };
    current.amount += entry.변제금액 + entry.유보액;
    current.presentValue = entry.현재가치; // 누적값
    yearlyMap.set(year, current);
  });

  const yearlySchedule: YearlyScheduleEntry[] = [];
  let cumulative = 0;

  Array.from(yearlyMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([year, data]) => {
      cumulative += data.amount;
      yearlySchedule.push({
        연도: year,
        연간변제금액: data.amount,
        누적변제금액: cumulative,
        현재가치: data.presentValue
      });
    });

  return yearlySchedule;
}
