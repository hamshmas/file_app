/**
 * MongoDB 연결 상태 공유 모듈
 * 순환 의존성을 피하기 위해 분리
 */

export const dbState = {
  isMongoConnected: false
};
