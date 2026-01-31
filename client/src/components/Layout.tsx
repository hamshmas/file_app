import { Outlet, Link, useLocation } from 'react-router-dom'
import { Home, FolderPlus, FileText, Settings } from 'lucide-react'
import { clsx } from 'clsx'

const navigation = [
  { name: '대시보드', href: '/', icon: Home },
  { name: '새 사건', href: '/new', icon: FolderPlus },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 사이드바 */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* 로고 */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <FileText className="w-8 h-8 text-primary-600" />
            <span className="ml-3 text-lg font-bold text-gray-900">
              개인회생 시스템
            </span>
          </div>

          {/* 네비게이션 */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* 하단 정보 */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center px-4 py-3 text-sm text-gray-500">
              <Settings className="w-4 h-4 mr-2" />
              부산회생법원 v1.0
            </div>
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="ml-64">
        <div className="px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
