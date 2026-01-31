import axios from 'axios'
import type { ICase, IDocument, CaseStats } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// 사건 관련 API
export const caseApi = {
  // 모든 사건 조회
  getAll: async (): Promise<ICase[]> => {
    const { data } = await api.get('/cases')
    return data
  },

  // 특정 사건 조회
  getById: async (id: string): Promise<ICase> => {
    const { data } = await api.get(`/cases/${id}`)
    return data
  },

  // 새 사건 생성
  create: async (caseData: Partial<ICase>): Promise<ICase> => {
    const { data } = await api.post('/cases', caseData)
    return data
  },

  // 사건 수정
  update: async (id: string, caseData: Partial<ICase>): Promise<ICase> => {
    const { data } = await api.put(`/cases/${id}`, caseData)
    return data
  },

  // 사건 삭제
  delete: async (id: string): Promise<void> => {
    await api.delete(`/cases/${id}`)
  },

  // 사건 상태 변경
  updateStatus: async (id: string, status: string): Promise<ICase> => {
    const { data } = await api.patch(`/cases/${id}/status`, { status })
    return data
  },

  // 사건 통계 조회
  getStats: async (id: string): Promise<CaseStats> => {
    const { data } = await api.get(`/cases/${id}/stats`)
    return data
  },

  // 추출된 데이터 업데이트
  updateExtractedData: async (id: string, extractedData: Record<string, unknown>): Promise<ICase> => {
    const { data } = await api.put(`/cases/${id}/extracted-data`, { extractedData })
    return data
  }
}

// 문서 관련 API
export const documentApi = {
  // 사건의 모든 문서 조회
  getByCaseId: async (caseId: string): Promise<IDocument[]> => {
    const { data } = await api.get(`/documents/case/${caseId}`)
    return data
  },

  // 특정 문서 조회
  getById: async (id: string): Promise<IDocument> => {
    const { data } = await api.get(`/documents/${id}`)
    return data
  },

  // 문서 업로드
  upload: async (
    caseId: string,
    category: string,
    subcategory: string,
    files: File[]
  ): Promise<IDocument[]> => {
    const formData = new FormData()
    formData.append('category', category)
    formData.append('subcategory', subcategory)
    files.forEach(file => formData.append('documents', file))

    const { data } = await api.post(`/documents/upload-multiple/${caseId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return data.documents
  },

  // 문서 삭제
  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`)
  },

  // 카테고리 변경
  updateCategory: async (
    id: string,
    category: string,
    subcategory: string
  ): Promise<IDocument> => {
    const { data } = await api.patch(`/documents/${id}/category`, { category, subcategory })
    return data
  }
}

// OCR 관련 API
export const ocrApi = {
  // 단일 문서 OCR 처리
  process: async (documentId: string): Promise<{ success: boolean; document: IDocument; needsCorrection: boolean }> => {
    const { data } = await api.post(`/ocr/process/${documentId}`)
    return data
  },

  // Gemini 후보정
  correct: async (documentId: string): Promise<{ success: boolean; document: IDocument; original: string; corrected: string }> => {
    const { data } = await api.post(`/ocr/correct/${documentId}`)
    return data
  },

  // 수동 텍스트 수정
  updateText: async (
    documentId: string,
    text: string,
    structuredData?: Record<string, unknown>
  ): Promise<IDocument> => {
    const { data } = await api.put(`/ocr/text/${documentId}`, { text, structuredData })
    return data
  },

  // 스캔 문서 확인
  checkScanned: async (documentId: string): Promise<{ isScanned: boolean }> => {
    const { data } = await api.get(`/ocr/check-scanned/${documentId}`)
    return data
  },

  // 일괄 OCR 처리
  processAll: async (caseId: string): Promise<{ processed: number; results: Array<{ documentId: string; success: boolean; error?: string }> }> => {
    const { data } = await api.post(`/ocr/process-all/${caseId}`)
    return data
  }
}

// 문서 생성 관련 API
export const generateApi = {
  // 문서에서 데이터 추출
  extractAll: async (caseId: string): Promise<{ success: boolean; extractedData: Record<string, unknown> }> => {
    const { data } = await api.post(`/generate/extract-all/${caseId}`)
    return data
  },

  // 채권자목록 생성
  creditorList: async (caseId: string): Promise<{ creditorList: Record<string, unknown>; pdfPath: string; hwpPath: string }> => {
    const { data } = await api.post(`/generate/creditor-list/${caseId}`)
    return data
  },

  // 재산목록 생성
  assetList: async (caseId: string): Promise<{ assetList: Record<string, unknown>; pdfPath: string; hwpPath: string }> => {
    const { data } = await api.post(`/generate/asset-list/${caseId}`)
    return data
  },

  // 수입지출목록 생성
  incomeExpenseList: async (caseId: string): Promise<{ incomeExpenseList: Record<string, unknown>; pdfPath: string; hwpPath: string }> => {
    const { data } = await api.post(`/generate/income-expense/${caseId}`)
    return data
  },

  // 변제계획안 생성
  repaymentPlan: async (caseId: string): Promise<{ repaymentPlan: Record<string, unknown>; pdfPath: string; hwpPath: string }> => {
    const { data } = await api.post(`/generate/repayment-plan/${caseId}`)
    return data
  },

  // 전체 문서 일괄 생성
  all: async (caseId: string): Promise<{ pdf: Record<string, string>; hwp: Record<string, string> }> => {
    const { data } = await api.post(`/generate/all/${caseId}`)
    return data
  }
}

export default api
