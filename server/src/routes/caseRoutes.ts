import { Router, Request, Response } from 'express';
import Case from '../models/Case';
import Document from '../models/Document';
import { dbState } from '../config/dbState';

const router = Router();

// In-memory 저장소 (MongoDB 없을 때 사용)
interface MockCase {
  _id: string;
  courtType: string;
  debtorName: string;
  debtorPhone?: string;
  debtorAddress?: string;
  status: string;
  documents: string[];
  extractedData: any;
  createdAt: Date;
  updatedAt: Date;
}

const mockCases: Map<string, MockCase> = new Map();
let mockIdCounter = 1;

// Mock 데이터 생성 헬퍼
function createMockCase(data: Partial<MockCase>): MockCase {
  const id = `mock_${mockIdCounter++}`;
  const now = new Date();
  return {
    _id: id,
    courtType: data.courtType || 'seoul',
    debtorName: data.debtorName || '',
    debtorPhone: data.debtorPhone,
    debtorAddress: data.debtorAddress,
    status: data.status || 'collecting',
    documents: [],
    extractedData: data.extractedData || {
      creditors: [],
      assets: [],
      income: [],
      expenses: []
    },
    createdAt: now,
    updatedAt: now
  };
}

// 모든 사건 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!dbState.isMongoConnected) {
      // Mock 데이터 반환
      const cases = Array.from(mockCases.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return res.json(cases);
    }

    const cases = await Case.find()
      .sort({ createdAt: -1 })
      .select('-extractedData');
    res.json(cases);
  } catch (error) {
    console.error('사건 목록 조회 오류:', error);
    res.status(500).json({ error: '사건 목록을 불러오는데 실패했습니다.' });
  }
});

// 특정 사건 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!dbState.isMongoConnected) {
      const caseData = mockCases.get(req.params.id);
      if (!caseData) {
        return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
      }
      return res.json(caseData);
    }

    const caseData = await Case.findById(req.params.id)
      .populate('documents');

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    res.json(caseData);
  } catch (error) {
    console.error('사건 조회 오류:', error);
    res.status(500).json({ error: '사건을 불러오는데 실패했습니다.' });
  }
});

// 새 사건 생성
router.post('/', async (req: Request, res: Response) => {
  try {
    const { courtType, debtorName, debtorPhone, debtorAddress } = req.body;

    if (!debtorName) {
      return res.status(400).json({ error: '채무자 이름은 필수입니다.' });
    }

    if (!dbState.isMongoConnected) {
      // Mock 사건 생성
      const mockCase = createMockCase({
        courtType: courtType || 'seoul',
        debtorName,
        debtorPhone,
        debtorAddress
      });
      mockCases.set(mockCase._id, mockCase);
      return res.status(201).json(mockCase);
    }

    const newCase = new Case({
      courtType: courtType || 'seoul',
      debtorName,
      debtorPhone,
      debtorAddress,
      status: 'collecting',
      documents: [],
      extractedData: {
        creditors: [],
        assets: [],
        income: [],
        expenses: []
      }
    });

    await newCase.save();
    res.status(201).json(newCase);
  } catch (error) {
    console.error('사건 생성 오류:', error);
    res.status(500).json({ error: '사건 생성에 실패했습니다.' });
  }
});

// 사건 수정
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!dbState.isMongoConnected) {
      const caseData = mockCases.get(req.params.id);
      if (!caseData) {
        return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
      }
      const updated = { ...caseData, ...req.body, updatedAt: new Date() };
      mockCases.set(req.params.id, updated);
      return res.json(updated);
    }

    const updateData = req.body;
    const caseData = await Case.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    res.json(caseData);
  } catch (error) {
    console.error('사건 수정 오류:', error);
    res.status(500).json({ error: '사건 수정에 실패했습니다.' });
  }
});

// 사건 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!dbState.isMongoConnected) {
      const deleted = mockCases.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
      }
      return res.json({ message: '사건이 삭제되었습니다.' });
    }

    // 관련 문서들도 함께 삭제
    await Document.deleteMany({ caseId: req.params.id });

    const caseData = await Case.findByIdAndDelete(req.params.id);

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    res.json({ message: '사건이 삭제되었습니다.' });
  } catch (error) {
    console.error('사건 삭제 오류:', error);
    res.status(500).json({ error: '사건 삭제에 실패했습니다.' });
  }
});

// 사건 상태 변경
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['collecting', 'processing', 'reviewing', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
    }

    if (!dbState.isMongoConnected) {
      const caseData = mockCases.get(req.params.id);
      if (!caseData) {
        return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
      }
      caseData.status = status;
      caseData.updatedAt = new Date();
      return res.json(caseData);
    }

    const caseData = await Case.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    res.json(caseData);
  } catch (error) {
    console.error('상태 변경 오류:', error);
    res.status(500).json({ error: '상태 변경에 실패했습니다.' });
  }
});

// 사건의 추출된 데이터 업데이트
router.put('/:id/extracted-data', async (req: Request, res: Response) => {
  try {
    const { extractedData } = req.body;

    if (!dbState.isMongoConnected) {
      const caseData = mockCases.get(req.params.id);
      if (!caseData) {
        return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
      }
      caseData.extractedData = extractedData;
      caseData.updatedAt = new Date();
      return res.json(caseData);
    }

    const caseData = await Case.findByIdAndUpdate(
      req.params.id,
      { extractedData },
      { new: true }
    );

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    res.json(caseData);
  } catch (error) {
    console.error('데이터 업데이트 오류:', error);
    res.status(500).json({ error: '데이터 업데이트에 실패했습니다.' });
  }
});

// 사건 통계 조회
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    if (!dbState.isMongoConnected) {
      const caseData = mockCases.get(req.params.id);
      if (!caseData) {
        return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
      }
      return res.json({
        totalDocuments: caseData.documents.length,
        completedOcr: 0,
        pendingOcr: caseData.documents.length,
        totalDebt: caseData.extractedData?.totalDebt || 0,
        totalAssets: caseData.extractedData?.totalAssets || 0,
        liquidationValue: caseData.extractedData?.liquidationValue || 0,
        creditorCount: caseData.extractedData?.creditors?.length || 0
      });
    }

    const caseData = await Case.findById(req.params.id);

    if (!caseData) {
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    const documentCount = await Document.countDocuments({ caseId: req.params.id });
    const completedOcr = await Document.countDocuments({
      caseId: req.params.id,
      ocrStatus: { $in: ['completed', 'corrected'] }
    });

    const stats = {
      totalDocuments: documentCount,
      completedOcr,
      pendingOcr: documentCount - completedOcr,
      totalDebt: caseData.extractedData?.totalDebt || 0,
      totalAssets: caseData.extractedData?.totalAssets || 0,
      liquidationValue: caseData.extractedData?.liquidationValue || 0,
      creditorCount: caseData.extractedData?.creditors?.length || 0
    };

    res.json(stats);
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '통계 조회에 실패했습니다.' });
  }
});

export default router;
