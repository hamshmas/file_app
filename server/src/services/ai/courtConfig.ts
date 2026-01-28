/**
 * 법원별 개인회생 기준 설정
 *
 * 각 법원마다 다른 기준을 적용하는 설정 모듈
 * - 피부양자 수 계산 방식
 * - 추가생계비 인정 기준
 * - 회생위원 보수 기준
 */

export type CourtCode =
  | 'SEOUL'      // 서울회생법원
  | 'BUSAN'      // 부산회생법원
  | 'DAEGU'      // 대구지방법원
  | 'DAEJEON'    // 대전지방법원
  | 'JEONJU'     // 전주지방법원
  | 'CHEONGJU'   // 청주지방법원
  | 'DEFAULT';   // 기본값 (서울 기준 적용)

export interface CourtConfig {
  code: CourtCode;
  name: string;
  // 피부양자 수 계산 방식
  dependentCalculation: 'STANDARD' | 'BUSAN_SPOUSE_RATIO';
  // 추가생계비 인정 최소 변제율 (%)
  minRepaymentRateForAdditionalExpense: number;
  // 소득연동 기타생계비 인정 여부 (중위소득 150% 초과 시)
  allowIncomeLinkedExpense: boolean;
  // 소득연동 기타생계비 인정 조건: 최근 6개월 발생 채무가 총 채무의 n% 이하
  maxRecentDebtRatio: number;
}

// 법원별 설정
const COURT_CONFIGS: Record<CourtCode, CourtConfig> = {
  SEOUL: {
    code: 'SEOUL',
    name: '서울회생법원',
    dependentCalculation: 'STANDARD',
    minRepaymentRateForAdditionalExpense: 0,
    allowIncomeLinkedExpense: false,
    maxRecentDebtRatio: 100
  },
  BUSAN: {
    code: 'BUSAN',
    name: '부산회생법원',
    dependentCalculation: 'BUSAN_SPOUSE_RATIO',
    minRepaymentRateForAdditionalExpense: 40,
    allowIncomeLinkedExpense: true,
    maxRecentDebtRatio: 50
  },
  DAEGU: {
    code: 'DAEGU',
    name: '대구지방법원',
    dependentCalculation: 'STANDARD',
    minRepaymentRateForAdditionalExpense: 0,
    allowIncomeLinkedExpense: false,
    maxRecentDebtRatio: 100
  },
  DAEJEON: {
    code: 'DAEJEON',
    name: '대전지방법원',
    dependentCalculation: 'STANDARD',
    minRepaymentRateForAdditionalExpense: 0,
    allowIncomeLinkedExpense: false,
    maxRecentDebtRatio: 100
  },
  JEONJU: {
    code: 'JEONJU',
    name: '전주지방법원',
    dependentCalculation: 'STANDARD',
    minRepaymentRateForAdditionalExpense: 0,
    allowIncomeLinkedExpense: false,
    maxRecentDebtRatio: 100
  },
  CHEONGJU: {
    code: 'CHEONGJU',
    name: '청주지방법원',
    dependentCalculation: 'STANDARD',
    minRepaymentRateForAdditionalExpense: 0,
    allowIncomeLinkedExpense: false,
    maxRecentDebtRatio: 100
  },
  DEFAULT: {
    code: 'DEFAULT',
    name: '기타 법원',
    dependentCalculation: 'STANDARD',
    minRepaymentRateForAdditionalExpense: 0,
    allowIncomeLinkedExpense: false,
    maxRecentDebtRatio: 100
  }
};

/**
 * 법원 코드로 설정 조회
 */
export function getCourtConfig(courtCode: CourtCode): CourtConfig {
  return COURT_CONFIGS[courtCode] || COURT_CONFIGS.DEFAULT;
}

/**
 * 모든 법원 설정 목록 조회
 */
export function getAllCourtConfigs(): CourtConfig[] {
  return Object.values(COURT_CONFIGS);
}

/**
 * 피부양자 수 계산 (부산회생법원 기준)
 *
 * 배우자 소득에 따른 피부양자 수 산정:
 * - 배우자 소득이 채무자 소득의 70%~130%: 미성년자녀 수의 1/2
 * - 배우자 소득이 채무자 소득의 70% 미만: 미성년자녀 수 전부
 * - 배우자 소득이 채무자 소득의 130% 초과: 0명
 *
 * @param debtorIncome - 채무자 월 소득
 * @param spouseIncome - 배우자 월 소득 (없으면 0)
 * @param minorChildrenCount - 미성년 자녀 수
 * @returns 피부양자 수
 */
export function calculateBusanDependents(
  debtorIncome: number,
  spouseIncome: number,
  minorChildrenCount: number
): number {
  if (debtorIncome <= 0) return minorChildrenCount;
  if (spouseIncome <= 0) return minorChildrenCount;

  const spouseRatio = spouseIncome / debtorIncome;

  if (spouseRatio > 1.3) {
    // 배우자 소득이 130% 초과: 0명
    return 0;
  } else if (spouseRatio >= 0.7) {
    // 배우자 소득이 70%~130%: 1/2
    return Math.ceil(minorChildrenCount / 2);
  } else {
    // 배우자 소득이 70% 미만: 전부
    return minorChildrenCount;
  }
}

/**
 * 피부양자 수 계산 (표준 방식)
 *
 * @param hasSpouse - 배우자 유무
 * @param spouseIncome - 배우자 소득
 * @param minorChildrenCount - 미성년 자녀 수
 * @param otherDependentsCount - 기타 부양가족 수 (부모 등)
 * @returns 피부양자 수
 */
export function calculateStandardDependents(
  hasSpouse: boolean,
  spouseIncome: number,
  minorChildrenCount: number,
  otherDependentsCount: number
): number {
  let dependents = 0;

  // 배우자가 있고 소득이 없는 경우 부양가족으로 포함
  if (hasSpouse && spouseIncome <= 0) {
    dependents += 1;
  }

  // 미성년 자녀
  dependents += minorChildrenCount;

  // 기타 부양가족
  dependents += otherDependentsCount;

  return dependents;
}

/**
 * 법원 기준에 따른 피부양자 수 계산
 */
export function calculateDependentsForCourt(
  courtCode: CourtCode,
  debtorIncome: number,
  hasSpouse: boolean,
  spouseIncome: number,
  minorChildrenCount: number,
  otherDependentsCount: number
): number {
  const config = getCourtConfig(courtCode);

  if (config.dependentCalculation === 'BUSAN_SPOUSE_RATIO') {
    // 부산 방식: 미성년 자녀만 배우자 소득 비율로 계산
    const adjustedChildren = calculateBusanDependents(
      debtorIncome,
      spouseIncome,
      minorChildrenCount
    );

    // 배우자 (소득 없는 경우) + 조정된 자녀 수 + 기타 부양가족
    let dependents = adjustedChildren + otherDependentsCount;
    if (hasSpouse && spouseIncome <= 0) {
      dependents += 1;
    }
    return dependents;
  }

  // 표준 방식
  return calculateStandardDependents(
    hasSpouse,
    spouseIncome,
    minorChildrenCount,
    otherDependentsCount
  );
}

/**
 * 소득연동 기타생계비 인정 가능 여부 확인 (부산회생법원)
 *
 * 조건:
 * 1. 월 소득이 기준 중위소득의 150% 초과
 * 2. 최근 6개월 발생 채무가 총 채무의 50% 이하
 * 3. 기타생계비를 반영해도 변제율 40% 이상
 */
export function canAllowIncomeLinkedExpense(
  courtCode: CourtCode,
  monthlyIncome: number,
  medianIncome150Percent: number,
  recentDebtAmount: number,
  totalDebtAmount: number,
  projectedRepaymentRate: number
): { allowed: boolean; reason: string } {
  const config = getCourtConfig(courtCode);

  if (!config.allowIncomeLinkedExpense) {
    return {
      allowed: false,
      reason: '해당 법원은 소득연동 기타생계비를 인정하지 않습니다.'
    };
  }

  // 조건 1: 소득이 중위소득 150% 초과
  if (monthlyIncome <= medianIncome150Percent) {
    return {
      allowed: false,
      reason: '월 소득이 기준 중위소득의 150% 이하입니다.'
    };
  }

  // 조건 2: 최근 채무 비율 확인
  const recentDebtRatio = totalDebtAmount > 0
    ? (recentDebtAmount / totalDebtAmount) * 100
    : 0;

  if (recentDebtRatio > config.maxRecentDebtRatio) {
    return {
      allowed: false,
      reason: `최근 6개월 발생 채무가 총 채무의 ${config.maxRecentDebtRatio}%를 초과합니다.`
    };
  }

  // 조건 3: 최소 변제율 확인
  if (projectedRepaymentRate < config.minRepaymentRateForAdditionalExpense) {
    return {
      allowed: false,
      reason: `변제율이 ${config.minRepaymentRateForAdditionalExpense}% 미만입니다.`
    };
  }

  return {
    allowed: true,
    reason: '소득연동 기타생계비 인정 조건을 충족합니다.'
  };
}

/**
 * 가구 규모 계산 (채무자 + 부양가족)
 */
export function calculateFamilySize(dependentsCount: number): number {
  // 채무자 본인(1) + 부양가족 수
  const familySize = 1 + dependentsCount;
  // 최대 6인 가구까지 인정 (기준 중위소득 기준)
  return Math.min(familySize, 6);
}
