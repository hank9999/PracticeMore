import { createContext, useContext, useState, useEffect } from 'react'
import { settingsAPI } from '../db'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('system')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // 从数据库加载主题设置
    settingsAPI.get('theme', 'system').then(savedTheme => {
      setTheme(savedTheme)
    })
  }, [])

  useEffect(() => {
    const updateDarkMode = () => {
      let dark = false
      if (theme === 'dark') {
        dark = true
      } else if (theme === 'light') {
        dark = false
      } else {
        // system
        dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      setIsDark(dark)
      document.documentElement.classList.toggle('dark', dark)
    }

    updateDarkMode()

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', updateDarkMode)

    return () => mediaQuery.removeEventListener('change', updateDarkMode)
  }, [theme])

  const changeTheme = async (newTheme) => {
    setTheme(newTheme)
    await settingsAPI.set('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
