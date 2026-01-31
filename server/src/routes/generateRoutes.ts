import { Router, Request, Response } from 'express';
import Case from '../models/Case';
import Document from '../models/Document';
import { generateCreditorList } from '../services/ai/creditorListGenerator';
import { generateAssetList } from '../services/ai/assetListGenerator';
import { generateIncomeExpenseList } from '../services/ai/incomeExpenseGenerator';
import { generateRepaymentPlan } from '../services/ai/repaymentPlanGenerator';
import { generatePdf, generateHwp } from '../services/output/documentGenerator';

const router = Router();

// 사건의 모든 문서에서 데이터 추출 및 통합
router.post('/extract-all/:caseId', async (req: Request, res: Response) => {
  try {
    const caseData = await Case.findById(req.params.caseId)
      .populate('documents');

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    // 각 문서에서 구조화된 데이터 수집
    const documents = await Document.find({
      caseId: req.params.caseId,
      ocrStatus: { $in: ['completed', 'corrected'] }
    });

    let creditors: any[] = [];
    let assets: any[] = [];
    let incomes: any[] = [];
    let expenses: any[] = [];

    for (const doc of documents) {
      if (doc.structuredData) {
        // 문서 유형에 따라 데이터 분류
        switch (doc.subcategory) {
          case 'debt_certificate':
          case 'loan_contract':
          case 'court_judgment':
            if (doc.structuredData.creditors) {
              creditors.push(...doc.structuredData.creditors);
            } else if (doc.structuredData.채권자명) {
              creditors.push(doc.structuredData);
            }
            break;

          case 'real_estate':
          case 'vehicle':
          case 'insurance':
          case 'bank_statement':
          case 'crypto_stock':
            if (doc.structuredData.assets) {
              assets.push(...doc.structuredData.assets);
            } else if (doc.structuredData.종류 || doc.structuredData.시가) {
              assets.push(doc.structuredData);
            }
            break;

          case 'salary':
          case 'business_income':
          case 'welfare':
            if (doc.structuredData.소득유형 || doc.structuredData.월수입) {
              incomes.push(doc.structuredData);
            }
            break;
        }
      }
    }

    // 채권자 순번 부여
    creditors = creditors.map((c, index) => ({
      ...c,
      순번: index + 1
    }));

    // 총계 계산
    const totalDebt = creditors.reduce((sum, c) => sum + (c.총채권액 || 0), 0);
    const totalAssets = assets.reduce((sum, a) => sum + (a.시가 || 0), 0);
    const liquidationValue = assets.reduce((sum, a) => sum + (a.청산가치 || 0), 0);
    const monthlyIncome = incomes.reduce((sum, i) => sum + (i.월수입 || 0), 0);

    // 사건 데이터 업데이트
    caseData.extractedData = {
      creditors,
      assets,
      income: incomes,
      expenses,
      totalDebt,
      totalAssets,
      liquidationValue,
      monthlyIncome
    };

    await caseData.save();

    res.json({
      success: true,
      extractedData: caseData.extractedData
    });
  } catch (error) {
    console.error('데이터 추출 오류:', error);
    res.status(500).json({ error: '데이터 추출에 실패했습니다.' });
  }
});

// 채무자목록(채권자목록) 생성
router.post('/creditor-list/:caseId', async (req: Request, res: Response) => {
  try {
    const caseData = await Case.findById(req.params.caseId);

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    const result = await generateCreditorList(caseData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('채권자목록 생성 오류:', error);
    res.status(500).json({ error: '채권자목록 생성에 실패했습니다.' });
  }
});

// 재산목록 생성
router.post('/asset-list/:caseId', async (req: Request, res: Response) => {
  try {
    const caseData = await Case.findById(req.params.caseId);

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    const result = await generateAssetList(caseData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('재산목록 생성 오류:', error);
    res.status(500).json({ error: '재산목록 생성에 실패했습니다.' });
  }
});

// 수입 및 지출에 관한 목록 생성
router.post('/income-expense/:caseId', async (req: Request, res: Response) => {
  try {
    const caseData = await Case.findById(req.params.caseId);

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    const result = await generateIncomeExpenseList(caseData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('수입지출목록 생성 오류:', error);
    res.status(500).json({ error: '수입지출목록 생성에 실패했습니다.' });
  }
});

// 변제계획안 생성
router.post('/repayment-plan/:caseId', async (req: Request, res: Response) => {
  try {
    const caseData = await Case.findById(req.params.caseId);

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    const { 변제기간 = 36 } = req.body;  // 기본 36개월

    const result = await generateRepaymentPlan(caseData, 변제기간);

    // 사건에 변제계획 저장
    caseData.repaymentPlan = {
      변제기간: result.변제기간,
      월변제금: result.월변제금,
      총변제금: result.총변제금,
      변제율: result.변제율
    };
    await caseData.save();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('변제계획안 생성 오류:', error);
    res.status(500).json({ error: '변제계획안 생성에 실패했습니다.' });
  }
});

// 전체 문서 일괄 생성
router.post('/all/:caseId', async (req: Request, res: Response) => {
  try {
    const caseData = await Case.findById(req.params.caseId);

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    // 1. 채권자목록 생성
    const creditorList = await generateCreditorList(caseData);

    // 2. 재산목록 생성
    const assetList = await generateAssetList(caseData);

    // 3. 수입지출목록 생성
    const incomeExpenseList = await generateIncomeExpenseList(caseData);

    // 4. 변제계획안 생성
    const repaymentPlan = await generateRepaymentPlan(caseData, 36);

    // 사건 상태 업데이트
    caseData.status = 'reviewing';
    caseData.repaymentPlan = {
      변제기간: repaymentPlan.변제기간,
      월변제금: repaymentPlan.월변제금,
      총변제금: repaymentPlan.총변제금,
      변제율: repaymentPlan.변제율
    };
    await caseData.save();

    res.json({
      success: true,
      documents: {
        creditorList,
        assetList,
        incomeExpenseList,
        repaymentPlan
      }
    });
  } catch (error) {
    console.error('문서 일괄 생성 오류:', error);
    res.status(500).json({ error: '문서 생성에 실패했습니다.' });
  }
});

// PDF 출력
router.get('/pdf/:caseId/:documentType', async (req: Request, res: Response) => {
  try {
    const { caseId, documentType } = req.params;
    const caseData = await Case.findById(caseId);

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    const pdfBuffer = await generatePdf(caseData, documentType);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${documentType}_${caseId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    res.status(500).json({ error: 'PDF 생성에 실패했습니다.' });
  }
});

// HWP 출력
router.get('/hwp/:caseId/:documentType', async (req: Request, res: Response) => {
  try {
    const { caseId, documentType } = req.params;
    const caseData = await Case.findById(caseId);

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    const hwpBuffer = await generateHwp(caseData, documentType);

    res.setHeader('Content-Type', 'application/x-hwp');
    res.setHeader('Content-Disposition', `attachment; filename="${documentType}_${caseId}.hwp"`);
    res.send(hwpBuffer);
  } catch (error) {
    console.error('HWP 생성 오류:', error);
    res.status(500).json({ error: 'HWP 생성에 실패했습니다.' });
  }
});

export default router;
