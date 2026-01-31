import { create } from 'zustand'
import type { ICase, IDocument } from '../types'

interface AppState {
  // 현재 선택된 사건
  currentCase: ICase | null
  setCurrentCase: (caseData: ICase | null) => void

  // 현재 사건의 문서들
  documents: IDocument[]
  setDocuments: (documents: IDocument[]) => void
  addDocument: (document: IDocument) => void
  updateDocument: (document: IDocument) => void
  removeDocument: (documentId: string) => void

  // 로딩 상태
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // 에러 메시지
  error: string | null
  setError: (error: string | null) => void

  // 알림 메시지
  notification: { type: 'success' | 'error' | 'info'; message: string } | null
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void
  clearNotification: () => void
}

const useStore = create<AppState>((set) => ({
  // 현재 선택된 사건
  currentCase: null,
  setCurrentCase: (caseData) => set({ currentCase: caseData }),

  // 문서 관리
  documents: [],
  setDocuments: (documents) => set({ documents }),
  addDocument: (document) =>
    set((state) => ({ documents: [...state.documents, document] })),
  updateDocument: (document) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d._id === document._id ? document : d
      )
    })),
  removeDocument: (documentId) =>
    set((state) => ({
      documents: state.documents.filter((d) => d._id !== documentId)
    })),

  // 로딩 상태
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // 에러 메시지
  error: null,
  setError: (error) => set({ error }),

  // 알림 메시지
  notification: null,
  showNotification: (type, message) => {
    set({ notification: { type, message } })
    // 3초 후 자동으로 알림 제거
    setTimeout(() => {
      set({ notification: null })
    }, 3000)
  },
  clearNotification: () => set({ notification: null })
}))

export default useStore
