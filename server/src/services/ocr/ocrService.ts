import vision from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { IDocument } from '../../models/Document';

// Google Cloud Vision 클라이언트
let visionClient: vision.ImageAnnotatorClient | null = null;

function getVisionClient(): vision.ImageAnnotatorClient {
  if (!visionClient) {
    const keyFilePath = process.env.GOOGLE_CLOUD_KEYFILE;
    if (keyFilePath && fs.existsSync(keyFilePath)) {
      visionClient = new vision.ImageAnnotatorClient({
        keyFilename: keyFilePath
      });
    } else {
      // 기본 인증 사용 (환경변수 GOOGLE_APPLICATION_CREDENTIALS)
      visionClient = new vision.ImageAnnotatorClient();
    }
  }
  return visionClient;
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

// Google Vision OCR 수행
async function performVisionOcr(filePath: string): Promise<OcrResult> {
  const client = getVisionClient();

  // 파일 읽기
  const imageContent = fs.readFileSync(filePath);
  const base64Image = imageContent.toString('base64');

  // OCR 요청
  const [result] = await client.textDetection({
    image: { content: base64Image }
  });

  const detections = result.textAnnotations;

  if (!detections || detections.length === 0) {
    return {
      text: '',
      confidence: 0,
      isScanned: true
    };
  }

  // 첫 번째 항목이 전체 텍스트
  const fullText = detections[0].description || '';

  // 신뢰도 계산 (개별 단어의 confidence 평균)
  let totalConfidence = 0;
  let count = 0;

  if (result.fullTextAnnotation?.pages) {
    for (const page of result.fullTextAnnotation.pages) {
      for (const block of page.blocks || []) {
        if (block.confidence) {
          totalConfidence += block.confidence;
          count++;
        }
      }
    }
  }

  const avgConfidence = count > 0 ? totalConfidence / count : 0.5;

  return {
    text: fullText,
    confidence: avgConfidence,
    isScanned: true
  };
}

// PDF를 이미지로 변환 후 OCR (스캔된 PDF용)
async function ocrScannedPdf(filePath: string): Promise<OcrResult> {
  const client = getVisionClient();

  // PDF를 바로 Vision API에 전송
  const fileContent = fs.readFileSync(filePath);

  const request = {
    requests: [{
      inputConfig: {
        content: fileContent.toString('base64'),
        mimeType: 'application/pdf'
      },
      features: [{
        type: 'DOCUMENT_TEXT_DETECTION' as const
      }],
      imageContext: {
        languageHints: ['ko', 'en']  // 한국어, 영어
      }
    }]
  };

  try {
    const [result] = await client.batchAnnotateFiles(request);
    const responses = result.responses;

    if (!responses || responses.length === 0) {
      return { text: '', confidence: 0, isScanned: true };
    }

    let fullText = '';
    let totalConfidence = 0;
    let pageCount = 0;

    for (const response of responses) {
      if (response.responses) {
        for (const pageResponse of response.responses) {
          if (pageResponse.fullTextAnnotation) {
            fullText += pageResponse.fullTextAnnotation.text + '\n';

            // 페이지별 신뢰도
            for (const page of pageResponse.fullTextAnnotation.pages || []) {
              if (page.confidence) {
                totalConfidence += page.confidence;
                pageCount++;
              }
            }
          }
        }
      }
    }

    const avgConfidence = pageCount > 0 ? totalConfidence / pageCount : 0.5;

    return {
      text: fullText.trim(),
      confidence: avgConfidence,
      isScanned: true
    };
  } catch (error) {
    console.error('PDF OCR 오류:', error);
    throw error;
  }
}

// 메인 OCR 처리 함수
export async function processOcr(document: IDocument): Promise<OcrResult> {
  const filePath = document.storagePath;

  if (!fs.existsSync(filePath)) {
    throw new Error('파일을 찾을 수 없습니다.');
  }

  const fileType = document.fileType;

  // 이미지 파일
  if (fileType === 'image') {
    return await performVisionOcr(filePath);
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

    // 스캔된 PDF - Vision OCR 수행
    return await ocrScannedPdf(filePath);
  }

  // HWP 등 기타 파일
  throw new Error('지원하지 않는 파일 형식입니다. (PDF, 이미지만 OCR 가능)');
}

// 파일이 스캔인지 확인
export async function checkIfScanned(document: IDocument): Promise<boolean> {
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
