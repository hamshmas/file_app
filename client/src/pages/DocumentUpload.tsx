import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, File, X, CheckCircle } from 'lucide-react'
import { documentApi, caseApi } from '../services/api'

// 부산회생법원 서류 카테고리
const categories = [
  {
    id: 'personal_info',
    name: '인적 사항 및 주거 관련',
    subcategories: [
      { id: 'family_relation', name: '가족관계증명서' },
      { id: 'marriage_relation', name: '혼인관계증명서' },
      { id: 'resident_registration', name: '주민등록등본/초본' },
      { id: 'housing', name: '현 주거사항에 관한 자료' }
    ]
  },
  {
    id: 'creditor_list',
    name: '개인회생채권자목록 관련',
    subcategories: [
      { id: 'debt_certificate', name: '부채증명서' },
      { id: 'loan_contract', name: '차용증/공정증서' },
      { id: 'court_judgment', name: '판결서' }
    ]
  },
  {
    id: 'asset_list',
    name: '재산목록 관련',
    subcategories: [
      { id: 'tax_certificate', name: '지방세 세목별 과세증명서' },
      { id: 'land_registry', name: '부동산 지적전산자료' },
      { id: 'real_estate', name: '부동산등기사항전부증명서' },
      { id: 'vehicle', name: '자동차등록원부' },
      { id: 'bank_statement', name: '은행 계좌거래내역서' },
      { id: 'credit_card', name: '신용카드 사용내역서' },
      { id: 'insurance', name: '보험가입내역' },
      { id: 'crypto_stock', name: '가상자산/주식' }
    ]
  },
  {
    id: 'income_expense',
    name: '수입 및 지출 관련',
    subcategories: [
      { id: 'expense_plan', name: '향후 생계비 지출계획' },
      { id: 'health_insurance', name: '건강보험자격득실확인서' },
      { id: 'pension', name: '연금산정용 가입내역확인서' },
      { id: 'employment', name: '재직증명서' },
      { id: 'salary', name: '급여액에 관한 자료' },
      { id: 'retirement', name: '퇴직금계산서' },
      { id: 'business_registration', name: '사업자등록증명' },
      { id: 'income_certificate', name: '소득금액증명' },
      { id: 'credit_education', name: '신용교육 이수증' }
    ]
  }
]

interface FileWithCategory {
  file: File
  category: string
  subcategory: string
}

export default function DocumentUpload() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [files, setFiles] = useState<FileWithCategory[]>([])

  const { data: caseData } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getById(id!)
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const grouped = files.reduce((acc, f) => {
        const key = `${f.category}|${f.subcategory}`
        if (!acc[key]) acc[key] = []
        acc[key].push(f.file)
        return acc
      }, {} as Record<string, File[]>)

      for (const [key, fileList] of Object.entries(grouped)) {
        const [category, subcategory] = key.split('|')
        await documentApi.upload(id!, category, subcategory, fileList)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      queryClient.invalidateQueries({ queryKey: ['case-stats', id] })
      navigate(`/case/${id}`)
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedCategory || !selectedSubcategory) {
      alert('카테고리와 서류 유형을 먼저 선택해주세요.')
      return
    }

    const newFiles = acceptedFiles.map(file => ({
      file,
      category: selectedCategory,
      subcategory: selectedSubcategory
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [selectedCategory, selectedSubcategory])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.tif'],
      'application/x-hwp': ['.hwp']
    }
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const currentSubcategories = categories.find(c => c.id === selectedCategory)?.subcategories || []

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
        <h1 className="text-2xl font-bold text-gray-900">서류 업로드</h1>
        <p className="mt-1 text-sm text-gray-500">
          {caseData?.debtorName} - 부산회생법원 자료제출목록 기준
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 카테고리 선택 */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">1. 카테고리 선택</h2>
          <div className="space-y-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id)
                  setSelectedSubcategory('')
                }}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedCategory === cat.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 서류 유형 선택 */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">2. 서류 유형 선택</h2>
          {selectedCategory ? (
            <div className="space-y-2">
              {currentSubcategories.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubcategory(sub.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedSubcategory === sub.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">
              먼저 카테고리를 선택해주세요
            </div>
          )}
        </div>

        {/* 파일 업로드 */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">3. 파일 업로드</h2>
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''} ${
              !selectedSubcategory ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <input {...getInputProps()} disabled={!selectedSubcategory} />
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-4 text-sm text-gray-600">
              {isDragActive
                ? '파일을 여기에 놓으세요'
                : '클릭하거나 파일을 드래그하세요'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              PDF, 이미지(PNG, JPG), HWP 파일 지원
            </p>
          </div>
        </div>
      </div>

      {/* 업로드할 파일 목록 */}
      {files.length > 0 && (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              업로드할 파일 ({files.length}개)
            </h2>
            <button
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending}
              className="btn btn-primary flex items-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? '업로드 중...' : '업로드 완료'}
            </button>
          </div>
          <div className="space-y-2">
            {files.map((f, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <File className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{f.file.name}</div>
                    <div className="text-sm text-gray-500">
                      {categories.find(c => c.id === f.category)?.name} &gt;{' '}
                      {categories
                        .find(c => c.id === f.category)
                        ?.subcategories.find(s => s.id === f.subcategory)?.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
