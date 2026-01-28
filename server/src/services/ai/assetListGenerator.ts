import { ICase, IAsset } from '../../models/Case';

export interface AssetListResult {
  재산목록: ProcessedAsset[];
  총재산액: number;
  청산가치: number;
  부동산합계: number;
  자동차합계: number;
  예금합계: number;
  보험합계: number;
  기타합계: number;
}

export interface ProcessedAsset {
  순번: number;
  재산유형: string;
  재산명: string;
  소재지_상세: string;
  취득일자?: string;
  시가: number;
  담보권설정액: number;
  청산가치: number;
  비고: string;
}

// 재산유형별 청산가치 계산 비율
const LIQUIDATION_RATIOS: Record<string, number> = {
  부동산: 0.7,      // 부동산 시가의 70%
  자동차: 0.5,      // 자동차 시가의 50%
  예금: 1.0,        // 예금은 100%
  보험: 1.0,        // 해약환급금 100%
  주식: 0.8,        // 주식 시가의 80%
  가상자산: 0.8,    // 가상자산 시가의 80%
  임차보증금: 1.0,  // 임차보증금 100%
  기타: 0.5         // 기타 재산 50%
};

// 재산목록 생성
export async function generateAssetList(caseData: ICase): Promise<AssetListResult> {
  const assets = caseData.extractedData?.assets || [];

  // 재산별 처리 및 청산가치 계산
  const processedAssets: ProcessedAsset[] = assets.map((asset, index) => {
    const 시가 = asset.시가 || 0;
    const 담보권설정액 = asset.담보권설정액 || 0;
    const ratio = LIQUIDATION_RATIOS[asset.재산유형] || 0.5;

    // 청산가치 = (시가 × 청산비율) - 담보권설정액
    // 음수일 경우 0으로 처리
    const 청산가치 = Math.max(0, (시가 * ratio) - 담보권설정액);

    return {
      순번: index + 1,
      재산유형: asset.재산유형 || '기타',
      재산명: asset.재산명 || '',
      소재지_상세: asset.소재지 || asset.상세정보 || '',
      취득일자: asset.취득일자,
      시가,
      담보권설정액,
      청산가치,
      비고: asset.비고 || ''
    };
  });

  // 재산유형별 합계 계산
  const 부동산합계 = processedAssets
    .filter(a => a.재산유형 === '부동산')
    .reduce((sum, a) => sum + a.시가, 0);

  const 자동차합계 = processedAssets
    .filter(a => a.재산유형 === '자동차')
    .reduce((sum, a) => sum + a.시가, 0);

  const 예금합계 = processedAssets
    .filter(a => a.재산유형 === '예금')
    .reduce((sum, a) => sum + a.시가, 0);

  const 보험합계 = processedAssets
    .filter(a => a.재산유형 === '보험')
    .reduce((sum, a) => sum + a.시가, 0);

  const 기타합계 = processedAssets
    .filter(a => !['부동산', '자동차', '예금', '보험'].includes(a.재산유형))
    .reduce((sum, a) => sum + a.시가, 0);

  // 총계 계산
  const 총재산액 = processedAssets.reduce((sum, a) => sum + a.시가, 0);
  const 청산가치 = processedAssets.reduce((sum, a) => sum + a.청산가치, 0);

  return {
    재산목록: processedAssets,
    총재산액,
    청산가치,
    부동산합계,
    자동차합계,
    예금합계,
    보험합계,
    기타합계
  };
}

// 부동산 상세 정보 생성
export function formatRealEstateDetail(asset: IAsset): string {
  const parts: string[] = [];

  if (asset.소재지) parts.push(`소재지: ${asset.소재지}`);
  if (asset.면적) parts.push(`면적: ${asset.면적}㎡`);
  if (asset.지목) parts.push(`지목: ${asset.지목}`);
  if (asset.용도) parts.push(`용도: ${asset.용도}`);

  return parts.join(', ');
}

// 자동차 상세 정보 생성
export function formatVehicleDetail(asset: IAsset): string {
  const parts: string[] = [];

  if (asset.재산명) parts.push(asset.재산명);
  if (asset.연식) parts.push(`${asset.연식}년식`);
  if (asset.주행거리) parts.push(`${asset.주행거리.toLocaleString()}km`);

  return parts.join(' / ');
}

// 보험 상세 정보 생성
export function formatInsuranceDetail(asset: IAsset): string {
  const parts: string[] = [];

  if (asset.재산명) parts.push(asset.재산명);
  if (asset.보험사) parts.push(`(${asset.보험사})`);
  if (asset.해약환급금) parts.push(`해약환급금: ${asset.해약환급금.toLocaleString()}원`);

  return parts.join(' ');
}
