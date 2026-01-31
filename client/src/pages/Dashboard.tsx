import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { caseApi } from '../services/api'
import type { ICase, CaseStatus } from '../types'

const statusConfig: Record<CaseStatus, { label: string; color: string; icon: React.ElementType }> = {
  collecting: { label: '서류 수집 중', color: 'badge-info', icon: Clock },
  processing: { label: 'OCR 처리 중', color: 'badge-warning', icon: Clock },
  reviewing: { label: '검토 중', color: 'badge-info', icon: AlertCircle },
  completed: { label: '완료', color: 'badge-success', icon: CheckCircle }
}

export default function Dashboard() {
  const { data: cases, isLoading, error } = useQuery({
    queryKey: ['cases'],
    queryFn: caseApi.getAll
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">오류가 발생했습니다.</div>
      </div>
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-1 text-sm text-gray-500">
            진행 중인 개인회생 사건 목록
          </p>
        </div>
        <Link to="/new" className="btn btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          새 사건
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="text-sm font-medium text-gray-500">전체 사건</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {cases?.length || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">서류 수집 중</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {cases?.filter(c => c.status === 'collecting').length || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">처리 중</div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">
            {cases?.filter(c => c.status === 'processing' || c.status === 'reviewing').length || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">완료</div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            {cases?.filter(c => c.status === 'completed').length || 0}
          </div>
        </div>
      </div>

      {/* 사건 목록 */}
      {cases && cases.length > 0 ? (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>채무자명</th>
                <th>법원</th>
                <th>상태</th>
                <th>생성일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem) => {
                const status = statusConfig[caseItem.status]
                const StatusIcon = status.icon
                return (
                  <tr key={caseItem._id}>
                    <td>
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {caseItem.debtorName}
                        </span>
                      </div>
                    </td>
                    <td>{caseItem.courtType === 'busan' ? '부산회생법원' : caseItem.courtType}</td>
                    <td>
                      <span className={`badge ${status.color} flex items-center w-fit`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </span>
                    </td>
                    <td>{new Date(caseItem.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td>
                      <Link
                        to={`/case/${caseItem._id}`}
                        className="text-primary-600 hover:text-primary-800 font-medium"
                      >
                        상세보기
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            등록된 사건이 없습니다
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            새 사건을 생성하여 개인회생 신청서 작성을 시작하세요.
          </p>
          <Link to="/new" className="btn btn-primary mt-4 inline-flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            새 사건 생성
          </Link>
        </div>
      )}
    </div>
  )
}
