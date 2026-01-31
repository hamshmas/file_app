import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Upload,
  FileSearch,
  ClipboardCheck,
  FileOutput,
  Trash2,
  ChevronRight,
  Play,
  Loader2,
  Eye,
  X
} from 'lucide-react'
import { caseApi, documentApi, ocrApi } from '../services/api'
import type { CaseStatus, IDocument } from '../types'

const statusConfig: Record<CaseStatus, { label: string; step: number }> = {
  collecting: { label: '서류 수집', step: 1 },
  processing: { label: 'OCR 처리', step: 2 },
  reviewing: { label: '데이터 검토', step: 3 },
  completed: { label: '문서 생성 완료', step: 4 }
}

const steps = [
  { id: 'upload', name: '서류 업로드', icon: Upload, href: 'upload' },
  { id: 'ocr', name: 'OCR 처리', icon: FileSearch, href: 'ocr' },
  { id: 'review', name: '데이터 검토', icon: ClipboardCheck, href: 'review' },
  { id: 'generate', name: '문서 생성', icon: FileOutput, href: 'generate' }
]

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedDoc, setSelectedDoc] = useState<IDocument | null>(null)

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getById(id!)
  })

  const { data: documents } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentApi.getByCaseId(id!)
  })

  const { data: stats } = useQuery({
    queryKey: ['case-stats', id],
    queryFn: () => caseApi.getStats(id!)
  })

  const deleteMutation = useMutation({
    mutationFn: () => caseApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      navigate('/')
    }
  })

  // OCR 일괄 처리
  const processAllOcrMutation = useMutation({
    mutationFn: () => ocrApi.processAll(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      queryClient.invalidateQueries({ queryKey: ['case-stats', id] })
    }
  })

  // 개별 문서 OCR 처리
  const processSingleOcrMutation = useMutation({
    mutationFn: (documentId: string) => ocrApi.process(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      queryClient.invalidateQueries({ queryKey: ['case-stats', id] })
    }
  })

  // 문서 삭제
  const deleteDocMutation = useMutation({
    mutationFn: (documentId: string) => documentApi.delete(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      queryClient.invalidateQueries({ queryKey: ['case-stats', id] })
    }
  })

  const handleDeleteDoc = (docId: string, filename: string) => {
    if (window.confirm(`"${filename}" 문서를 삭제하시겠습니까?`)) {
      deleteDocMutation.mutate(docId)
    }
  }

  const handleDelete = () => {
    if (window.confirm('정말 이 사건을 삭제하시겠습니까? 모든 관련 문서도 함께 삭제됩니다.')) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">사건을 찾을 수 없습니다.</div>
      </div>
    )
  }

  const currentStep = statusConfig[caseData.status]?.step || 1

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          목록으로
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{caseData.debtorName}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {caseData.courtType === 'busan' ? '부산회생법원' : caseData.courtType} ·
              생성일: {new Date(caseData.createdAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="btn btn-danger flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </button>
        </div>
      </div>

      {/* 진행 단계 */}
      <div className="card mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">진행 단계</h2>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon
            const isCompleted = index + 1 < currentStep
            const isCurrent = index + 1 === currentStep

            return (
              <div key={step.id} className="flex items-center">
                <Link
                  to={`/case/${id}/${step.href}`}
                  className={`flex flex-col items-center ${
                    isCompleted || isCurrent ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-100 text-green-600'
                        : isCurrent
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <StepIcon className="w-6 h-6" />
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.name}
                  </span>
                </Link>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-6 h-6 mx-4 text-gray-300" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="text-sm font-medium text-gray-500">업로드 문서</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {stats.totalDocuments}건
            </div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-500">OCR 완료</div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {stats.completedOcr}건
            </div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-500">채권자 수</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {stats.creditorCount}명
            </div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-500">총 채무액</div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              {stats.totalDebt?.toLocaleString() || 0}원
            </div>
          </div>
        </div>
      )}

      {/* 빠른 작업 버튼 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Link
          to={`/case/${id}/upload`}
          className="card hover:border-primary-300 transition-colors text-center py-6"
        >
          <Upload className="w-8 h-8 mx-auto text-primary-600 mb-2" />
          <span className="font-medium text-gray-900">서류 업로드</span>
        </Link>
        <Link
          to={`/case/${id}/ocr`}
          className="card hover:border-primary-300 transition-colors text-center py-6"
        >
          <FileSearch className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
          <span className="font-medium text-gray-900">OCR 처리</span>
          {stats && stats.pendingOcr > 0 && (
            <span className="block text-sm text-yellow-600 mt-1">
              {stats.pendingOcr}건 대기 중
            </span>
          )}
        </Link>
        <Link
          to={`/case/${id}/review`}
          className="card hover:border-primary-300 transition-colors text-center py-6"
        >
          <ClipboardCheck className="w-8 h-8 mx-auto text-green-600 mb-2" />
          <span className="font-medium text-gray-900">데이터 검토</span>
        </Link>
        <Link
          to={`/case/${id}/generate`}
          className="card hover:border-primary-300 transition-colors text-center py-6"
        >
          <FileOutput className="w-8 h-8 mx-auto text-blue-600 mb-2" />
          <span className="font-medium text-gray-900">문서 생성</span>
        </Link>
      </div>

      {/* 최근 업로드 문서 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">업로드된 문서</h2>
          <div className="flex items-center space-x-4">
            {documents && documents.some(d => d.ocrStatus === 'pending') && (
              <button
                onClick={() => processAllOcrMutation.mutate()}
                disabled={processAllOcrMutation.isPending}
                className="btn btn-primary flex items-center text-sm"
              >
                {processAllOcrMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {processAllOcrMutation.isPending ? '처리 중...' : '전체 OCR 처리'}
              </button>
            )}
            <Link
              to={`/case/${id}/upload`}
              className="text-primary-600 hover:text-primary-800 text-sm font-medium"
            >
              서류 업로드 →
            </Link>
          </div>
        </div>

        {documents && documents.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>파일명</th>
                <th>카테고리</th>
                <th>OCR 상태</th>
                <th>업로드일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id}>
                  <td className="font-medium">{doc.originalFilename}</td>
                  <td>{doc.subcategory}</td>
                  <td>
                    <span
                      className={`badge ${
                        doc.ocrStatus === 'completed' || doc.ocrStatus === 'corrected'
                          ? 'badge-success'
                          : doc.ocrStatus === 'failed'
                          ? 'badge-error'
                          : doc.ocrStatus === 'processing'
                          ? 'badge-warning'
                          : 'badge-info'
                      }`}
                    >
                      {doc.ocrStatus === 'completed' ? '완료' :
                       doc.ocrStatus === 'corrected' ? '보정완료' :
                       doc.ocrStatus === 'failed' ? '실패' :
                       doc.ocrStatus === 'processing' ? '처리중' : '대기중'}
                    </span>
                  </td>
                  <td>{new Date(doc.uploadedAt).toLocaleDateString('ko-KR')}</td>
                  <td>
                    {doc.ocrStatus === 'pending' && (
                      <button
                        onClick={() => processSingleOcrMutation.mutate(doc._id)}
                        disabled={processSingleOcrMutation.isPending}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
                      >
                        {processSingleOcrMutation.isPending ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 mr-1" />
                        )}
                        OCR 실행
                      </button>
                    )}
                    {doc.ocrStatus === 'failed' && (
                      <button
                        onClick={() => processSingleOcrMutation.mutate(doc._id)}
                        disabled={processSingleOcrMutation.isPending}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        재시도
                      </button>
                    )}
                    {(doc.ocrStatus === 'completed' || doc.ocrStatus === 'corrected') && (
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        OCR 결과 보기
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDoc(doc._id, doc.originalFilename)}
                      disabled={deleteDocMutation.isPending}
                      className="text-gray-400 hover:text-red-600 text-sm ml-2"
                      title="문서 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

      {/* OCR 결과 모달 */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                OCR 결과: {selectedDoc.originalFilename}
              </h3>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">카테고리:</span>{' '}
                  <span className="font-medium">{selectedDoc.subcategory}</span>
                </div>
                <div>
                  <span className="text-gray-500">신뢰도:</span>{' '}
                  <span className="font-medium">
                    {selectedDoc.ocrConfidence ? `${(selectedDoc.ocrConfidence * 100).toFixed(1)}%` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">스캔 여부:</span>{' '}
                  <span className="font-medium">
                    {selectedDoc.isScanned ? '스캔 문서' : '텍스트 문서'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[300px]">
                <h4 className="text-sm font-medium text-gray-700 mb-2">추출된 텍스트:</h4>
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {selectedDoc.correctedText || selectedDoc.extractedText || '추출된 텍스트가 없습니다.'}
                </pre>
              </div>
              {selectedDoc.structuredData && Object.keys(selectedDoc.structuredData).length > 0 && (
                <div className="mt-4 bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">구조화된 데이터:</h4>
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {JSON.stringify(selectedDoc.structuredData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="btn btn-secondary"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
