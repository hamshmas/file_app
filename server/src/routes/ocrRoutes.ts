import { Router, Request, Response } from 'express';
import Document from '../models/Document';
import { processOcrWithGemini, checkIfScannedWithGemini } from '../services/ocr/geminiOcrService';
import { correctWithGemini } from '../services/ocr/geminiService';
import { dbState } from '../config/dbState';

const router = Router();

// In-memory mock 문서 저장소 (documentRoutes와 공유해야 하지만 간단하게 처리)
interface MockDocument {
  _id: string;
  caseId: string;
  category: string;
  subcategory: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  fileType: string;
  isScanned: boolean;
  ocrStatus: string;
  extractedText?: string;
  correctedText?: string;
  structuredData?: any;
  ocrConfidence?: number;
  needsCorrection?: boolean;
  processedAt?: Date;
  uploadedAt: Date;
}

// documentRoutes의 mockDocuments에 접근하기 위한 임시 해결책
// 실제로는 공유 스토어를 사용해야 함
const getMockDocument = async (id: string): Promise<MockDocument | null> => {
  // MongoDB가 연결되어 있으면 실제 Document 사용
  if (dbState.isMongoConnected) {
    return null;
  }
  // Mock 모드에서는 null 반환 (documentRoutes에서 관리)
  return null;
};

// 문서 OCR 처리
router.post('/process/:documentId', async (req: Request, res: Response) => {
  try {
    // GEMINI_API_KEY 확인
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 추가해주세요.'
      });
    }

    const document = await Document.findById(req.params.documentId);

    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    // OCR 상태 업데이트
    document.ocrStatus = 'processing';
    await document.save();

    // Gemini OCR 처리 수행
    const result = await processOcrWithGemini(document);

    // 결과 저장
    document.extractedText = result.text;
    document.ocrConfidence = result.confidence;
    document.isScanned = result.isScanned;
    document.processedAt = new Date();

    // 자동으로 Gemini 후보정 수행
    try {
      const correctedResult = await correctWithGemini(
        result.text,
        document.subcategory
      );
      document.correctedText = correctedResult.text;
      document.structuredData = correctedResult.structuredData;
      document.ocrStatus = 'corrected';
      document.needsCorrection = false;
    } catch (correctionError) {
      console.error('후보정 오류 (OCR은 완료됨):', correctionError);
      document.ocrStatus = 'completed';
      document.needsCorrection = true;
    }

    await document.save();

    res.json({
      success: true,
      document,
      needsCorrection: document.needsCorrection
    });
  } catch (error) {
    console.error('OCR 처리 오류:', error);

    // 오류 발생시 상태 업데이트
    await Document.findByIdAndUpdate(req.params.documentId, {
      ocrStatus: 'failed'
    });

    const errorMessage = error instanceof Error ? error.message : 'OCR 처리에 실패했습니다.';
    res.status(500).json({ error: errorMessage });
  }
});

// Gemini 후보정 처리
router.post('/correct/:documentId', async (req: Request, res: Response) => {
  try {
    // GEMINI_API_KEY 확인
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 추가해주세요.'
      });
    }

    const document = await Document.findById(req.params.documentId);

    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    if (!document.extractedText) {
      return res.status(400).json({ error: 'OCR 처리된 텍스트가 없습니다.' });
    }

    // Gemini로 후보정
    const correctedResult = await correctWithGemini(
      document.extractedText,
      document.subcategory
    );

    document.correctedText = correctedResult.text;
    document.structuredData = correctedResult.structuredData;
    document.ocrStatus = 'corrected';
    document.needsCorrection = false;
    await document.save();

    res.json({
      success: true,
      document,
      original: document.extractedText,
      corrected: document.correctedText,
      structuredData: document.structuredData
    });
  } catch (error) {
    console.error('Gemini 후보정 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '후보정 처리에 실패했습니다.';
    res.status(500).json({ error: errorMessage });
  }
});

// 수동으로 텍스트 수정
router.put('/text/:documentId', async (req: Request, res: Response) => {
  try {
    const { text, structuredData } = req.body;

    const document = await Document.findByIdAndUpdate(
      req.params.documentId,
      {
        correctedText: text,
        structuredData,
        ocrStatus: 'corrected',
        needsCorrection: false
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    res.json(document);
  } catch (error) {
    console.error('텍스트 수정 오류:', error);
    res.status(500).json({ error: '텍스트 수정에 실패했습니다.' });
  }
});

// 문서가 스캔인지 확인
router.get('/check-scanned/:documentId', async (req: Request, res: Response) => {
  try {
    const document = await Document.findById(req.params.documentId);

    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    const isScanned = await checkIfScannedWithGemini(document);

    // 결과 저장
    document.isScanned = isScanned;
    await document.save();

    res.json({ isScanned });
  } catch (error) {
    console.error('스캔 확인 오류:', error);
    res.status(500).json({ error: '스캔 확인에 실패했습니다.' });
  }
});

// 사건의 모든 문서 일괄 OCR 처리
router.post('/process-all/:caseId', async (req: Request, res: Response) => {
  try {
    // GEMINI_API_KEY 확인
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 추가해주세요.'
      });
    }

    const documents = await Document.find({
      caseId: req.params.caseId,
      ocrStatus: 'pending'
    });

    if (documents.length === 0) {
      return res.json({
        processed: 0,
        results: [],
        message: '처리할 문서가 없습니다.'
      });
    }

    const results = [];

    for (const doc of documents) {
      try {
        doc.ocrStatus = 'processing';
        await doc.save();

        const result = await processOcrWithGemini(doc);

        doc.extractedText = result.text;
        doc.ocrConfidence = result.confidence;
        doc.isScanned = result.isScanned;
        doc.processedAt = new Date();

        // 자동으로 Gemini 후보정 수행
        try {
          const correctedResult = await correctWithGemini(
            result.text,
            doc.subcategory
          );
          doc.correctedText = correctedResult.text;
          doc.structuredData = correctedResult.structuredData;
          doc.ocrStatus = 'corrected';
          doc.needsCorrection = false;
        } catch (correctionError) {
          console.error('후보정 오류:', correctionError);
          doc.ocrStatus = 'completed';
          doc.needsCorrection = true;
        }

        await doc.save();

        results.push({
          documentId: doc._id,
          filename: doc.originalFilename,
          success: true,
          extractedText: result.text.slice(0, 200) + (result.text.length > 200 ? '...' : ''),
          structuredData: doc.structuredData
        });
      } catch (err) {
        doc.ocrStatus = 'failed';
        await doc.save();

        results.push({
          documentId: doc._id,
          filename: doc.originalFilename,
          success: false,
          error: (err as Error).message
        });
      }
    }

    res.json({
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('일괄 OCR 처리 오류:', error);
    res.status(500).json({ error: '일괄 OCR 처리에 실패했습니다.' });
  }
});

// 데이터 추출 API - 문서에서 구조화된 데이터 추출
router.post('/extract/:documentId', async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY가 설정되지 않았습니다.'
      });
    }

    const document = await Document.findById(req.params.documentId);

    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    const textToProcess = document.correctedText || document.extractedText;
    if (!textToProcess) {
      return res.status(400).json({ error: '추출할 텍스트가 없습니다. 먼저 OCR을 수행하세요.' });
    }

    // Gemini로 데이터 추출
    const correctedResult = await correctWithGemini(textToProcess, document.subcategory);

    document.structuredData = correctedResult.structuredData;
    await document.save();

    res.json({
      success: true,
      document,
      structuredData: correctedResult.structuredData
    });
  } catch (error) {
    console.error('데이터 추출 오류:', error);
    res.status(500).json({ error: '데이터 추출에 실패했습니다.' });
  }
});

export default router;
