import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Document, { IDocument } from '../models/Document';
import Case from '../models/Case';
import { CATEGORIES, getSubcategoriesByCategory } from '../config/categories';
import { dbState } from '../config/dbState';

const router = Router();

// In-memory 저장소 (MongoDB 없을 때 사용)
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
  ocrText?: string;
  structuredData?: any;
  uploadedAt: Date;
}

const mockDocuments: Map<string, MockDocument> = new Map();
let mockDocIdCounter = 1;

// Multer 설정 - 파일 저장
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const caseId = req.params.caseId || req.body.caseId || 'temp';
    const uploadDir = path.join(__dirname, '../../../uploads', caseId);

    // 디렉토리 생성
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 파일명 유니코드 디코딩
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// 파일 필터 - 허용되는 파일 타입
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/gif',
    'application/x-hwp',
    'application/haansofthwp',
    'application/vnd.hancom.hwp'
  ];

  if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.hwp')) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024  // 50MB 제한
  }
});

// 파일 타입 판별
function getFileType(mimeType: string, filename: string): 'pdf' | 'image' | 'hwp' | 'other' {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('hwp') || filename.endsWith('.hwp')) return 'hwp';
  return 'other';
}

// 카테고리 목록 조회
router.get('/categories', (req: Request, res: Response) => {
  const categoriesWithSubs = CATEGORIES.map(cat => ({
    ...cat,
    subcategories: getSubcategoriesByCategory(cat.id)
  }));
  res.json(categoriesWithSubs);
});

// 특정 사건의 문서 목록 조회
router.get('/case/:caseId', async (req: Request, res: Response) => {
  try {
    if (!dbState.isMongoConnected) {
      // Mock 데이터 반환
      const docs = Array.from(mockDocuments.values())
        .filter(d => d.caseId === req.params.caseId)
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      return res.json(docs);
    }

    const documents = await Document.find({ caseId: req.params.caseId })
      .sort({ uploadedAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error('문서 목록 조회 오류:', error);
    res.status(500).json({ error: '문서 목록을 불러오는데 실패했습니다.' });
  }
});

// 특정 문서 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!dbState.isMongoConnected) {
      const document = mockDocuments.get(req.params.id);
      if (!document) {
        return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      }
      return res.json(document);
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    res.json(document);
  } catch (error) {
    console.error('문서 조회 오류:', error);
    res.status(500).json({ error: '문서를 불러오는데 실패했습니다.' });
  }
});

// 파일 업로드 (단일)
router.post('/upload/:caseId', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 없습니다.' });
    }

    const { category, subcategory } = req.body;
    const caseId = req.params.caseId;

    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const fileType = getFileType(req.file.mimetype, originalName);
    const isScanned = fileType === 'image';

    if (!dbState.isMongoConnected) {
      // Mock 모드: 파일은 저장되지만 DB는 메모리에
      const mockDoc: MockDocument = {
        _id: `mock_doc_${mockDocIdCounter++}`,
        caseId,
        category: category || 'other',
        subcategory: subcategory || 'other',
        originalFilename: originalName,
        storagePath: req.file.path,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileType,
        isScanned,
        ocrStatus: 'pending',
        uploadedAt: new Date()
      };
      mockDocuments.set(mockDoc._id, mockDoc);
      return res.status(201).json(mockDoc);
    }

    // 사건 존재 확인
    const caseExists = await Case.findById(caseId);
    if (!caseExists) {
      // 업로드된 파일 삭제
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    const document = new Document({
      caseId,
      category: category || 'other',
      subcategory: subcategory || 'other',
      originalFilename: originalName,
      storagePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileType,
      isScanned,
      ocrStatus: isScanned ? 'pending' : 'pending',
      uploadedAt: new Date()
    });

    await document.save();

    // 사건에 문서 참조 추가
    await Case.findByIdAndUpdate(caseId, {
      $push: { documents: document._id }
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ error: '파일 업로드에 실패했습니다.' });
  }
});

// 파일 업로드 (다중) - documents 필드명 사용
router.post('/upload-multiple/:caseId', upload.array('documents', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '파일이 없습니다.' });
    }

    const caseId = req.params.caseId;
    const { category, subcategory } = req.body;

    if (!dbState.isMongoConnected) {
      // Mock 모드
      const documents: MockDocument[] = [];

      for (const file of files) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const fileType = getFileType(file.mimetype, originalName);
        const isScanned = fileType === 'image';

        const mockDoc: MockDocument = {
          _id: `mock_doc_${mockDocIdCounter++}`,
          caseId,
          category: category || 'other',
          subcategory: subcategory || 'other',
          originalFilename: originalName,
          storagePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          fileType,
          isScanned,
          ocrStatus: 'pending',
          uploadedAt: new Date()
        };
        mockDocuments.set(mockDoc._id, mockDoc);
        documents.push(mockDoc);
      }

      return res.status(201).json({ documents });
    }

    // 사건 존재 확인
    const caseExists = await Case.findById(caseId);
    if (!caseExists) {
      // 업로드된 파일들 삭제
      files.forEach(file => fs.unlinkSync(file.path));
      return res.status(404).json({ error: '사건을 찾을 수 없습니다.' });
    }

    const documents: IDocument[] = [];

    for (const file of files) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const fileType = getFileType(file.mimetype, originalName);
      const isScanned = fileType === 'image';

      const document = new Document({
        caseId,
        category: category || 'other',
        subcategory: subcategory || 'other',
        originalFilename: originalName,
        storagePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileType,
        isScanned,
        ocrStatus: 'pending',
        uploadedAt: new Date()
      });

      await document.save();
      documents.push(document);
    }

    // 사건에 문서 참조 추가
    await Case.findByIdAndUpdate(caseId, {
      $push: { documents: { $each: documents.map(d => d._id) } }
    });

    res.status(201).json({ documents });
  } catch (error) {
    console.error('다중 파일 업로드 오류:', error);
    res.status(500).json({ error: '파일 업로드에 실패했습니다.' });
  }
});

// 문서 카테고리 변경
router.patch('/:id/category', async (req: Request, res: Response) => {
  try {
    const { category, subcategory } = req.body;

    if (!dbState.isMongoConnected) {
      const document = mockDocuments.get(req.params.id);
      if (!document) {
        return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      }
      document.category = category;
      document.subcategory = subcategory;
      return res.json(document);
    }

    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { category, subcategory },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    res.json(document);
  } catch (error) {
    console.error('카테고리 변경 오류:', error);
    res.status(500).json({ error: '카테고리 변경에 실패했습니다.' });
  }
});

// 문서 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!dbState.isMongoConnected) {
      const document = mockDocuments.get(req.params.id);
      if (!document) {
        return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      }
      // 파일 삭제
      if (fs.existsSync(document.storagePath)) {
        fs.unlinkSync(document.storagePath);
      }
      mockDocuments.delete(req.params.id);
      return res.json({ message: '문서가 삭제되었습니다.' });
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    // 파일 삭제
    if (fs.existsSync(document.storagePath)) {
      fs.unlinkSync(document.storagePath);
    }

    // 사건에서 문서 참조 제거
    await Case.findByIdAndUpdate(document.caseId, {
      $pull: { documents: document._id }
    });

    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: '문서가 삭제되었습니다.' });
  } catch (error) {
    console.error('문서 삭제 오류:', error);
    res.status(500).json({ error: '문서 삭제에 실패했습니다.' });
  }
});

// 문서 다운로드
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    if (!dbState.isMongoConnected) {
      const document = mockDocuments.get(req.params.id);
      if (!document) {
        return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      }
      if (!fs.existsSync(document.storagePath)) {
        return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
      }
      return res.download(document.storagePath, document.originalFilename);
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    if (!fs.existsSync(document.storagePath)) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    res.download(document.storagePath, document.originalFilename);
  } catch (error) {
    console.error('문서 다운로드 오류:', error);
    res.status(500).json({ error: '문서 다운로드에 실패했습니다.' });
  }
});

export default router;
