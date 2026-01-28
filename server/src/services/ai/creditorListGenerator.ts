import { ICase, ICreditor } from '../../models/Case';

export interface CreditorListResult {
  채권자목록: ICreditor[];
  총채무액: number;
  담보채권액: number;
  무담보채권액: number;
  채권자수: number;
}

// 채권자목록 생성
export async function generateCreditorList(caseData: ICase): Promise<CreditorListResult> {
  const creditors = caseData.extractedData?.creditors || [];

  // 채권자별 순번 재정렬 및 계산
  const processedCreditors: ICreditor[] = creditors.map((c, index) => {
    const 총채권액 = (c.원금 || 0) + (c.이자 || 0) + (c.지연손해금 || 0);
    return {
      순번: index + 1,
      채권자명: c.채권자명 || '',
      주소: c.주소 || '',
      채권원인: c.채권원인 || '',
      원금: c.원금 || 0,
      이자: c.이자 || 0,
      지연손해금: c.지연손해금 || 0,
      총채권액: c.총채권액 || 총채권액,
      담보여부: c.담보여부 || false,
      담보내용: c.담보내용 || ''
    };
  });

  // 총계 계산
  const 총채무액 = processedCreditors.reduce((sum, c) => sum + c.총채권액, 0);
  const 담보채권액 = processedCreditors
    .filter(c => c.담보여부)
    .reduce((sum, c) => sum + c.총채권액, 0);
  const 무담보채권액 = 총채무액 - 담보채권액;

  return {
    채권자목록: processedCreditors,
    총채무액,
    담보채권액,
    무담보채권액,
    채권자수: processedCreditors.length
  };
}
