import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Plus, Trash2, ChevronRight, RefreshCw } from 'lucide-react'
import { caseApi, generateApi } from '../services/api'
import type { ICreditor, IAsset, IIncome, IExpense } from '../types'

type TabType = 'creditors' | 'assets' | 'income' | 'expenses'

export default function DataReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabType>('creditors')

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getById(id!)
  })

  const [extractedData, setExtractedData] = useState({
    creditors: [] as ICreditor[],
    assets: [] as IAsset[],
    income: [] as IIncome[],
    expenses: [] as IExpense[]
  })

  // 데이터 로드 시 상태 업데이트
  useEffect(() => {
    if (caseData?.extractedData) {
      setExtractedData({
        creditors: caseData.extractedData.creditors || [],
        assets: caseData.extractedData.assets || [],
        income: caseData.extractedData.income || [],
        expenses: caseData.extractedData.expenses || []
      })
    }
  }, [caseData])

  // 문서에서 데이터 추출
  const extractMutation = useMutation({
    mutationFn: () => generateApi.extractAll(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] })
    }
  })

  const saveMutation = useMutation({
    mutationFn: () => caseApi.updateExtractedData(id!, extractedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] })
      alert('저장되었습니다.')
    }
  })

  // 채권자 추가
  const addCreditor = () => {
    const newCreditor: ICreditor = {
      순번: extractedData.creditors.length + 1,
      채권자명: '',
      채권원인: '',
      원금: 0,
      이자: 0,
      지연손해금: 0,
      총채권액: 0,
      담보여부: false
    }
    setExtractedData(prev => ({
      ...prev,
      creditors: [...prev.creditors, newCreditor]
    }))
  }

  // 재산 추가
  const addAsset = () => {
    const newAsset: IAsset = {
      재산유형: '예금',
      재산명: '',
      시가: 0
    }
    setExtractedData(prev => ({
      ...prev,
      assets: [...prev.assets, newAsset]
    }))
  }

  // 수입 추가
  const addIncome = () => {
    const newIncome: IIncome = {
      소득유형: '급여',
      소득원: '',
      월소득액: 0
    }
    setExtractedData(prev => ({
      ...prev,
      income: [...prev.income, newIncome]
    }))
  }

  // 지출 추가
  const addExpense = () => {
    const newExpense: IExpense = {
      지출항목: '식비',
      월지출액: 0
    }
    setExtractedData(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense]
    }))
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>
  }

  const tabs = [
    { id: 'creditors', name: '채권자 목록', count: extractedData.creditors.length },
    { id: 'assets', name: '재산 목록', count: extractedData.assets.length },
    { id: 'income', name: '수입', count: extractedData.income.length },
    { id: 'expenses', name: '지출', count: extractedData.expenses.length }
  ]

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
            <h1 className="text-2xl font-bold text-gray-900">데이터 검토</h1>
            <p className="mt-1 text-sm text-gray-500">
              {caseData?.debtorName} - 추출된 데이터를 검토하고 수정합니다
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => extractMutation.mutate()}
              disabled={extractMutation.isPending}
              className="btn btn-secondary flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${extractMutation.isPending ? 'animate-spin' : ''}`} />
              {extractMutation.isPending ? '추출 중...' : '문서에서 추출'}
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="btn btn-primary flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* 채권자 목록 */}
      {activeTab === 'creditors' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">채권자 목록</h2>
            <button onClick={addCreditor} className="btn btn-secondary flex items-center">
              <Plus className="w-4 h-4 mr-1" />
              채권자 추가
            </button>
          </div>
          <div className="space-y-4">
            {extractedData.creditors.map((creditor, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">채권자명</label>
                    <input
                      type="text"
                      value={creditor.채권자명}
                      onChange={e => {
                        const updated = [...extractedData.creditors]
                        updated[index] = { ...creditor, 채권자명: e.target.value }
                        setExtractedData(prev => ({ ...prev, creditors: updated }))
                      }}
                      className="input mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">채권원인</label>
                    <input
                      type="text"
                      value={creditor.채권원인}
                      onChange={e => {
                        const updated = [...extractedData.creditors]
                        updated[index] = { ...creditor, 채권원인: e.target.value }
                        setExtractedData(prev => ({ ...prev, creditors: updated }))
                      }}
                      className="input mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">원금</label>
                    <input
                      type="number"
                      value={creditor.원금}
                      onChange={e => {
                        const updated = [...extractedData.creditors]
                        updated[index] = { ...creditor, 원금: Number(e.target.value) }
                        setExtractedData(prev => ({ ...prev, creditors: updated }))
                      }}
                      className="input mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">총채권액</label>
                    <input
                      type="number"
                      value={creditor.총채권액}
                      onChange={e => {
                        const updated = [...extractedData.creditors]
                        updated[index] = { ...creditor, 총채권액: Number(e.target.value) }
                        setExtractedData(prev => ({ ...prev, creditors: updated }))
                      }}
                      className="input mt-1"
                    />
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => {
                      const updated = extractedData.creditors.filter((_, i) => i !== index)
                      setExtractedData(prev => ({ ...prev, creditors: updated }))
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {extractedData.creditors.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 채권자가 없습니다. 위 버튼을 클릭하여 추가하세요.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 재산 목록 */}
      {activeTab === 'assets' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">재산 목록</h2>
            <button onClick={addAsset} className="btn btn-secondary flex items-center">
              <Plus className="w-4 h-4 mr-1" />
              재산 추가
            </button>
          </div>
          <div className="space-y-4">
            {extractedData.assets.map((asset, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">재산유형</label>
                    <select
                      value={asset.재산유형}
                      onChange={e => {
                        const updated = [...extractedData.assets]
                        updated[index] = { ...asset, 재산유형: e.target.value }
                        setExtractedData(prev => ({ ...prev, assets: updated }))
                      }}
                      className="input mt-1"
                    >
                      <option value="부동산">부동산</option>
                      <option value="자동차">자동차</option>
                      <option value="예금">예금</option>
                      <option value="보험">보험</option>
                      <option value="주식">주식</option>
                      <option value="가상자산">가상자산</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">재산명</label>
                    <input
                      type="text"
                      value={asset.재산명}
                      onChange={e => {
                        const updated = [...extractedData.assets]
                        updated[index] = { ...asset, 재산명: e.target.value }
                        setExtractedData(prev => ({ ...prev, assets: updated }))
                      }}
                      className="input mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">시가</label>
                    <input
                      type="number"
                      value={asset.시가}
                      onChange={e => {
                        const updated = [...extractedData.assets]
                        updated[index] = { ...asset, 시가: Number(e.target.value) }
                        setExtractedData(prev => ({ ...prev, assets: updated }))
                      }}
                      className="input mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        const updated = extractedData.assets.filter((_, i) => i !== index)
                        setExtractedData(prev => ({ ...prev, assets: updated }))
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {extractedData.assets.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 재산이 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 수입 */}
      {activeTab === 'income' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">수입 목록</h2>
            <button onClick={addIncome} className="btn btn-secondary flex items-center">
              <Plus className="w-4 h-4 mr-1" />
              수입 추가
            </button>
          </div>
          <div className="space-y-4">
            {extractedData.income.map((inc, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">소득유형</label>
                    <select
                      value={inc.소득유형}
                      onChange={e => {
                        const updated = [...extractedData.income]
                        updated[index] = { ...inc, 소득유형: e.target.value }
                        setExtractedData(prev => ({ ...prev, income: updated }))
                      }}
                      className="input mt-1"
                    >
                      <option value="급여">급여</option>
                      <option value="영업">영업소득</option>
                      <option value="연금">연금</option>
                      <option value="임대">임대소득</option>
                      <option value="배우자">배우자소득</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">소득원</label>
                    <input
                      type="text"
                      value={inc.소득원}
                      onChange={e => {
                        const updated = [...extractedData.income]
                        updated[index] = { ...inc, 소득원: e.target.value }
                        setExtractedData(prev => ({ ...prev, income: updated }))
                      }}
                      className="input mt-1"
                      placeholder="예: OO회사"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">월소득액</label>
                    <input
                      type="number"
                      value={inc.월소득액}
                      onChange={e => {
                        const updated = [...extractedData.income]
                        updated[index] = { ...inc, 월소득액: Number(e.target.value) }
                        setExtractedData(prev => ({ ...prev, income: updated }))
                      }}
                      className="input mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        const updated = extractedData.income.filter((_, i) => i !== index)
                        setExtractedData(prev => ({ ...prev, income: updated }))
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {extractedData.income.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 수입이 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 지출 */}
      {activeTab === 'expenses' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">지출 목록</h2>
            <button onClick={addExpense} className="btn btn-secondary flex items-center">
              <Plus className="w-4 h-4 mr-1" />
              지출 추가
            </button>
          </div>
          <div className="space-y-4">
            {extractedData.expenses.map((exp, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">지출항목</label>
                    <select
                      value={exp.지출항목}
                      onChange={e => {
                        const updated = [...extractedData.expenses]
                        updated[index] = { ...exp, 지출항목: e.target.value }
                        setExtractedData(prev => ({ ...prev, expenses: updated }))
                      }}
                      className="input mt-1"
                    >
                      <option value="주거비">주거비</option>
                      <option value="식비">식비</option>
                      <option value="교통비">교통비</option>
                      <option value="통신비">통신비</option>
                      <option value="의료비">의료비</option>
                      <option value="교육비">교육비</option>
                      <option value="보험료">보험료</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">월지출액</label>
                    <input
                      type="number"
                      value={exp.월지출액}
                      onChange={e => {
                        const updated = [...extractedData.expenses]
                        updated[index] = { ...exp, 월지출액: Number(e.target.value) }
                        setExtractedData(prev => ({ ...prev, expenses: updated }))
                      }}
                      className="input mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        const updated = extractedData.expenses.filter((_, i) => i !== index)
                        setExtractedData(prev => ({ ...prev, expenses: updated }))
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {extractedData.expenses.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 지출이 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 다음 단계 버튼 */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => navigate(`/case/${id}/generate`)}
          className="btn btn-primary flex items-center"
        >
          문서 생성으로
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  )
}
