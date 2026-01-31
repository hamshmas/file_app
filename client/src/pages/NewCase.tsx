import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { caseApi } from '../services/api'

export default function NewCase() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    courtType: 'busan',
    debtorName: '',
    debtorPhone: '',
    debtorAddress: ''
  })

  const mutation = useMutation({
    mutationFn: caseApi.create,
    onSuccess: (data) => {
      navigate(`/case/${data._id}`)
    }
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.debtorName.trim()) {
      alert('채무자 이름을 입력해주세요.')
      return
    }
    mutation.mutate(formData)
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          뒤로가기
        </button>
        <h1 className="text-2xl font-bold text-gray-900">새 사건 생성</h1>
        <p className="mt-1 text-sm text-gray-500">
          개인회생 신청을 위한 새 사건을 생성합니다.
        </p>
      </div>

      {/* 폼 */}
      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 법원 선택 */}
          <div>
            <label htmlFor="courtType" className="block text-sm font-medium text-gray-700 mb-1">
              법원 선택
            </label>
            <select
              id="courtType"
              name="courtType"
              value={formData.courtType}
              onChange={handleChange}
              className="input"
            >
              <option value="busan">부산회생법원</option>
              <option value="daegu" disabled>대구지방법원 (준비 중)</option>
              <option value="daejeon" disabled>대전지방법원 (준비 중)</option>
              <option value="jeonju" disabled>전주지방법원 (준비 중)</option>
              <option value="cheongju" disabled>청주지방법원 (준비 중)</option>
            </select>
          </div>

          {/* 채무자 정보 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">채무자 정보</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="debtorName" className="block text-sm font-medium text-gray-700 mb-1">
                  채무자 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="debtorName"
                  name="debtorName"
                  value={formData.debtorName}
                  onChange={handleChange}
                  placeholder="홍길동"
                  className="input"
                  required
                />
              </div>

              <div>
                <label htmlFor="debtorPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  연락처
                </label>
                <input
                  type="tel"
                  id="debtorPhone"
                  name="debtorPhone"
                  value={formData.debtorPhone}
                  onChange={handleChange}
                  placeholder="010-1234-5678"
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="debtorAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  주소
                </label>
                <input
                  type="text"
                  id="debtorAddress"
                  name="debtorAddress"
                  value={formData.debtorAddress}
                  onChange={handleChange}
                  placeholder="부산시 해운대구..."
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-primary flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {mutation.isPending ? '생성 중...' : '사건 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
