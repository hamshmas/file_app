import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { caseApi, generateApi } from '../services/api'

interface GeneratedDocument {
  name: string
  pdfPath?: string
  hwpPath?: string
  status: 'pending' | 'generating' | 'completed' | 'error'
  error?: string
}

export default function DocumentGeneration() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: caseData } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getById(id!)
  })

  const [documents, setDocuments] = useState<GeneratedDocument[]>([
    { name: '채권자목록', status: 'pending' },
    { name: '재산목록', status: 'pending' },
    { name: '수입지출목록', status: 'pending' },
    { name: '변제계획안', status: 'pending' }
  ])

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      // 순차적으로 각 문서 생성
      const updatedDocs = [...documents]

      // 채권자목록
      setDocuments(prev => prev.map(d => d.name === '채권자목록' ? { ...d, status: 'generating' } : d))
      try {
        const creditorResult = await generateApi.creditorList(id!)
        updatedDocs[0] = {
          ...updatedDocs[0],
          status: 'completed',
          pdfPath: creditorResult.pdfPath,
          hwpPath: creditorResult.hwpPath
        }
        setDocuments([...updatedDocs])
      } catch (e) {
        updatedDocs[0] = { ...updatedDocs[0], status: 'error', error: '생성 실패' }
        setDocuments([...updatedDocs])
      }

      // 재산목록
      setDocuments(prev => prev.map(d => d.name === '재산목록' ? { ...d, status: 'generating' } : d))
      try {
        const assetResult = await generateApi.assetList(id!)
        updatedDocs[1] = {
          ...updatedDocs[1],
          status: 'completed',
          pdfPath: assetResult.pdfPath,
          hwpPath: assetResult.hwpPath
        }
        setDocuments([...updatedDocs])
      } catch (e) {
        updatedDocs[1] = { ...updatedDocs[1], status: 'error', error: '생성 실패' }
        setDocuments([...updatedDocs])
      }

      // 수입지출목록
      setDocuments(prev => prev.map(d => d.name === '수입지출목록' ? { ...d, status: 'generating' } : d))
      try {
        const incomeResult = await generateApi.incomeExpenseList(id!)
        updatedDocs[2] = {
          ...updatedDocs[2],
          status: 'completed',
          pdfPath: incomeResult.pdfPath,
          hwpPath: incomeResult.hwpPath
        }
        setDocuments([...updatedDocs])
      } catch (e) {
        updatedDocs[2] = { ...updatedDocs[2], status: 'error', error: '생성 실패' }
        setDocuments([...updatedDocs])
      }

      // 변제계획안
      setDocuments(prev => prev.map(d => d.name === '변제계획안' ? { ...d, status: 'generating' } : d))
      try {
        const repaymentResult = await generateApi.repaymentPlan(id!)
        updatedDocs[3] = {
          ...updatedDocs[3],
          status: 'completed',
          pdfPath: repaymentResult.pdfPath,
          hwpPath: repaymentResult.hwpPath
        }
        setDocuments([...updatedDocs])
      } catch (e) {
        updatedDocs[3] = { ...updatedDocs[3], status: 'error', error: '생성 실패' }
        setDocuments([...updatedDocs])
      }

      return updatedDocs
    },
    onSuccess: async () => {
      // 사건 상태를 완료로 변경
      await caseApi.updateStatus(id!, 'completed')
    }
  })

  const allCompleted = documents.every(d => d.status === 'completed')
  const hasError = documents.some(d => d.status === 'error')
  const isGenerating = generateAllMutation.isPending

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
            <h1 className="text-2xl font-bold text-gray-900">문서 생성</h1>
            <p className="mt-1 text-sm text-gray-500">
              {caseData?.debtorName} - 개인회생 신청 문서를 생성합니다
            </p>
          </div>
          {!allCompleted && !isGenerating && (
            <button
              onClick={() => generateAllMutation.mutate()}
              className="btn btn-primary"
            >
              전체 문서 생성
            </button>
          )}
        </div>
      </div>

      {/* 문서 목록 */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-6">생성할 문서</h2>
        <div className="space-y-4">
          {documents.map((doc, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                doc.status === 'completed'
                  ? 'border-green-200 bg-green-50'
                  : doc.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : doc.status === 'generating'
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center">
                <FileText className={`w-6 h-6 mr-3 ${
                  doc.status === 'completed' ? 'text-green-600' :
                  doc.status === 'error' ? 'text-red-600' :
                  doc.status === 'generating' ? 'text-yellow-600' :
                  'text-gray-400'
                }`} />
                <div>
                  <div className="font-medium text-gray-900">{doc.name}</div>
                  <div className="text-sm text-gray-500">
                    {doc.status === 'pending' && '대기 중'}
                    {doc.status === 'generating' && '생성 중...'}
                    {doc.status === 'completed' && '생성 완료'}
                    {doc.status === 'error' && doc.error}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {doc.status === 'generating' && (
                  <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                )}
                {doc.status === 'completed' && (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex items-center space-x-2">
                      {doc.pdfPath && (
                        <a
                          href={`/api/download?path=${encodeURIComponent(doc.pdfPath)}`}
                          className="btn btn-secondary text-sm py-1 px-3 flex items-center"
                          download
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </a>
                      )}
                      {doc.hwpPath && (
                        <a
                          href={`/api/download?path=${encodeURIComponent(doc.hwpPath)}`}
                          className="btn btn-secondary text-sm py-1 px-3 flex items-center"
                          download
                        >
                          <Download className="w-4 h-4 mr-1" />
                          HWP
                        </a>
                      )}
                    </div>
                  </>
                )}
                {doc.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 완료 메시지 */}
      {allCompleted && (
        <div className="card mt-6 bg-green-50 border-green-200">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
            <div>
              <h3 className="font-medium text-green-900">모든 문서가 생성되었습니다!</h3>
              <p className="text-sm text-green-700 mt-1">
                PDF 및 HWP 파일을 다운로드하여 법원에 제출하세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {hasError && (
        <div className="card mt-6 bg-red-50 border-red-200">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-red-600 mr-4" />
            <div>
              <h3 className="font-medium text-red-900">일부 문서 생성에 실패했습니다.</h3>
              <p className="text-sm text-red-700 mt-1">
                데이터를 확인하고 다시 시도해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 안내 사항 */}
      <div className="card mt-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">안내 사항</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="text-primary-600 mr-2">1.</span>
            생성된 문서는 자동으로 작성된 초안입니다. 반드시 내용을 검토하세요.
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-2">2.</span>
            HWP 파일은 편집이 가능하므로, 필요시 수정 후 제출하세요.
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-2">3.</span>
            변제계획안의 변제금액, 변제기간 등은 법원의 기준에 맞게 조정이 필요할 수 있습니다.
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-2">4.</span>
            서류 누락이나 오류가 있을 경우 법원에서 보정명령이 발부될 수 있습니다.
          </li>
        </ul>
      </div>
    </div>
  )
}
