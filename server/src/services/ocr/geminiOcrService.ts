import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { IDocument } from '../../models/Document';

// Gemini 클라이언트
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

interface OcrResult {
  text: string;
  confidence: number;
  isScanned: boolean;
}

// PDF에서 텍스트 추출 시도
async function extractTextFromPdf(filePath: string): Promise<string | null> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);

    // 텍스트가 충분히 있으면 텍스트 기반 PDF
    if (data.text && data.text.trim().length > 100) {
      return data.text;
    }

    return null;
  } catch (error) {
    console.error('PDF 텍스트 추출 오류:', error);
    return null;
  }
}

// Gemini Vision으로 이미지 OCR 수행
async function performGeminiOcr(filePath: string): Promise<OcrResult> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // 파일 읽기 및 base64 인코딩
  const imageContent = fs.readFileSync(filePath);
  const base64Image = imageContent.toString('base64');

  // 파일 확장자로 MIME 타입 결정
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  };
  const mimeType = mimeTypeMap[ext] || 'image/jpeg';

  const prompt = `이 이미지에서 모든 텍스트를 정확하게 추출해주세요.
다음 형식으로 응답해주세요:
1. 추출된 텍스트만 그대로 출력 (마크다운이나 추가 설명 없이)
2. 원본 문서의 레이아웃을 최대한 유지
3. 한국어와 영어, 숫자를 정확하게 인식
4. 표가 있는 경우 가독성 있게 정리

이미지에서 추출된 텍스트:`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Image
        }
      },
      prompt
    ]);

    const response = await result.response;
    const text = response.text();

    return {
      text: text.trim(),
      confidence: 0.85, // Gemini는 신뢰도를 직접 반환하지 않으므로 기본값 사용
      isScanned: true
    };
  } catch (error) {
    console.error('Gemini OCR 오류:', error);
    throw error;
  }
}

// PDF 파일의 각 페이지를 이미지로 처리하는 것은 복잡하므로
// PDF는 텍스트 추출만 시도하고, 실패시 에러 반환
async function ocrScannedPdf(filePath: string): Promise<OcrResult> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // PDF를 base64로 인코딩
  const pdfContent = fs.readFileSync(filePath);
  const base64Pdf = pdfContent.toString('base64');

  const prompt = `이 PDF 문서에서 모든 텍스트를 정확하게 추출해주세요.
다음 형식으로 응답해주세요:
1. 추출된 텍스트만 그대로 출력 (마크다운이나 추가 설명 없이)
2. 원본 문서의 레이아웃을 최대한 유지
3. 한국어와 영어, 숫자를 정확하게 인식
4. 표가 있는 경우 가독성 있게 정리
5. 여러 페이지가 있는 경우 순서대로 추출

PDF에서 추출된 텍스트:`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Pdf
        }
      },
      prompt
    ]);

    const response = await result.response;
    const text = response.text();

    return {
      text: text.trim(),
      confidence: 0.85,
      isScanned: true
    };
  } catch (error) {
    console.error('PDF OCR 오류:', error);
    throw error;
  }
}

// 메인 OCR 처리 함수
export async function processOcrWithGemini(document: IDocument): Promise<OcrResult> {
  const filePath = document.storagePath;

  if (!fs.existsSync(filePath)) {
    throw new Error('파일을 찾을 수 없습니다.');
  }

  const fileType = document.fileType;

  // 이미지 파일
  if (fileType === 'image') {
    return await performGeminiOcr(filePath);
  }

  // PDF 파일
  if (fileType === 'pdf') {
    // 먼저 텍스트 추출 시도
    const textContent = await extractTextFromPdf(filePath);

    if (textContent) {
      // 텍스트 기반 PDF
      return {
        text: textContent,
        confidence: 1.0,  // 텍스트 기반이므로 신뢰도 100%
        isScanned: false
      };
    }

    // 스캔된 PDF - Gemini로 OCR 수행
    return await ocrScannedPdf(filePath);
  }

  // HWP 등 기타 파일
  throw new Error('지원하지 않는 파일 형식입니다. (PDF, 이미지만 OCR 가능)');
}

// 파일이 스캔인지 확인
export async function checkIfScannedWithGemini(document: IDocument): Promise<boolean> {
  const filePath = document.storagePath;

  if (!fs.existsSync(filePath)) {
    throw new Error('파일을 찾을 수 없습니다.');
  }

  // 이미지 파일은 항상 스캔으로 간주
  if (document.fileType === 'image') {
    return true;
  }

  // PDF 파일
  if (document.fileType === 'pdf') {
    const textContent = await extractTextFromPdf(filePath);
    // 텍스트가 거의 없으면 스캔 PDF
    return !textContent || textContent.trim().length < 100;
  }

  return false;
}
