import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Play, CheckCircle, AlertCircle, FileText, Wand2 } from 'lucide-react'
import { documentApi, ocrApi, caseApi } from '../services/api'
import type { IDocument } from '../types'

export default function OcrProcessing() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedDoc, setSelectedDoc] = useState<IDocument | null>(null)
  const [showCorrectionModal, setShowCorrectionModal] = useState(false)

  const { data: caseData } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getById(id!)
  })

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentApi.getByCaseId(id!)
  })

  const processAllMutation = useMutation({
    mutationFn: () => ocrApi.processAll(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
    }
  })

  const processSingleMutation = useMutation({
    mutationFn: (documentId: string) => ocrApi.process(documentId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      if (result.needsCorrection) {
        setSelectedDoc(result.document)
        setShowCorrectionModal(true)
      }
    }
  })

  const correctMutation = useMutation({
    mutationFn: (documentId: string) => ocrApi.correct(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      setShowCorrectionModal(false)
      setSelectedDoc(null)
    }
  })

  const pendingDocs = documents?.filter(d => d.ocrStatus === 'pending') || []
  const completedDocs = documents?.filter(d => d.ocrStatus === 'completed' || d.ocrStatus === 'corrected') || []
  const failedDocs = documents?.filter(d => d.ocrStatus === 'failed') || []

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/case/${id}`)}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          사건 상세로
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OCR 처리</h1>
            <p className="mt-1 text-sm text-gray-500">
              {caseData?.debtorName} - 스캔 문서의 텍스트를 추출합니다
            </p>
          </div>
          {pendingDocs.length > 0 && (
            <button
              onClick={() => processAllMutation.mutate()}
              disabled={processAllMutation.isPending}
              className="btn btn-primary flex items-center"
            >
              <Play className="w-4 h-4 mr-2" />
              {processAllMutation.isPending ? '처리 중...' : `전체 OCR 처리 (${pendingDocs.length}건)`}
            </button>
          )}
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="text-sm font-medium text-gray-500">전체 문서</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {documents?.length || 0}건
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">대기 중</div>
          <div className="mt-2 text-2xl font-bold text-yellow-600">
            {pendingDocs.length}건
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">완료</div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            {completedDocs.length}건
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">실패</div>
          <div className="mt-2 text-2xl font-bold text-red-600">
            {failedDocs.length}건
          </div>
        </div>
      </div>

      {/* 문서 목록 */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">문서 목록</h2>
        {documents && documents.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>파일명</th>
                <th>유형</th>
                <th>스캔 여부</th>
                <th>OCR 상태</th>
                <th>신뢰도</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id}>
                  <td>
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-gray-400" />
                      {doc.originalFilename}
                    </div>
                  </td>
                  <td>{doc.subcategory}</td>
                  <td>
                    {doc.isScanned ? (
                      <span className="badge badge-warning">스캔</span>
                    ) : (
                      <span className="badge badge-success">텍스트</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        doc.ocrStatus === 'completed' ? 'badge-success' :
                        doc.ocrStatus === 'corrected' ? 'badge-success' :
                        doc.ocrStatus === 'failed' ? 'badge-error' :
                        doc.ocrStatus === 'processing' ? 'badge-warning' :
                        'badge-info'
                      }`}
                    >
                      {doc.ocrStatus === 'completed' ? '완료' :
                       doc.ocrStatus === 'corrected' ? '보정완료' :
                       doc.ocrStatus === 'failed' ? '실패' :
                       doc.ocrStatus === 'processing' ? '처리중' : '대기중'}
                    </span>
                  </td>
                  <td>
                    {doc.ocrConfidence !== undefined ? (
                      <span className={doc.ocrConfidence >= 0.8 ? 'text-green-600' : 'text-yellow-600'}>
                        {Math.round(doc.ocrConfidence * 100)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      {doc.ocrStatus === 'pending' && (
                        <button
                          onClick={() => processSingleMutation.mutate(doc._id)}
                          disabled={processSingleMutation.isPending}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          OCR 실행
                        </button>
                      )}
                      {doc.ocrStatus === 'completed' && doc.needsCorrection && (
                        <button
                          onClick={() => {
                            setSelectedDoc(doc)
                            setShowCorrectionModal(true)
                          }}
                          className="text-yellow-600 hover:text-yellow-800 text-sm font-medium flex items-center"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          후보정
                        </button>
                      )}
                      {(doc.ocrStatus === 'completed' || doc.ocrStatus === 'corrected') && (
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                          결과 보기
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            업로드된 문서가 없습니다.
          </div>
        )}
      </div>

      {/* 후보정 모달 */}
      {showCorrectionModal && selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Gemini 후보정 확인
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              "{selectedDoc.originalFilename}" 문서의 OCR 신뢰도가 낮습니다 (
              {Math.round((selectedDoc.ocrConfidence || 0) * 100)}%).
              Gemini AI로 후보정을 진행하시겠습니까?
            </p>

            {selectedDoc.extractedText && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  추출된 텍스트 (미리보기)
                </label>
                <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto text-sm">
                  {selectedDoc.extractedText.slice(0, 500)}
                  {selectedDoc.extractedText.length > 500 && '...'}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCorrectionModal(false)
                  setSelectedDoc(null)
                }}
                className="btn btn-secondary"
              >
                나중에 하기
              </button>
              <button
                onClick={() => correctMutation.mutate(selectedDoc._id)}
                disabled={correctMutation.isPending}
                className="btn btn-primary flex items-center"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {correctMutation.isPending ? '처리 중...' : 'Gemini 후보정 실행'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 완료 시 다음 단계 버튼 */}
      {pendingDocs.length === 0 && completedDocs.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => navigate(`/case/${id}/review`)}
            className="btn btn-primary flex items-center"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            데이터 검토로 이동
          </button>
        </div>
      )}
    </div>
  )
}
