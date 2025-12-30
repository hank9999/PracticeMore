import { NavLink, useLocation } from 'react-router-dom'
import { Home, BookOpen, Star, Clock, Settings, X } from 'lucide-react'

const navItems = [
  { path: '/', icon: Home, label: '首页' },
  { path: '/wrong', icon: BookOpen, label: '错题本' },
  { path: '/favorites', icon: Star, label: '收藏' },
  { path: '/history', icon: Clock, label: '历史' },
  { path: '/settings', icon: Settings, label: '设置' },
]

export default function NavBar() {
  const location = useLocation()

  // 刷题页面不显示导航栏
  if (location.pathname.startsWith('/practice')) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-card)] border-t border-[var(--color-border)] z-50 safe-area-pb">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 transition-colors ${
                isActive
                  ? 'text-blue-500'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-xs mt-0.5">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
