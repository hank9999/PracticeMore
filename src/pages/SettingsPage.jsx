import { useState } from 'react'
import { Moon, Sun, Monitor, Download, Upload, Trash2, Database, FileJson } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { exportAPI, db } from '../db'
import { downloadJSON, readFileAsText } from '../utils/helpers'

export default function SettingsPage() {
  const { theme, changeTheme } = useTheme()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const themeOptions = [
    { value: 'light', label: '浅色', icon: Sun },
    { value: 'dark', label: '深色', icon: Moon },
    { value: 'system', label: '跟随系统', icon: Monitor },
  ]

  const handleExportAll = async () => {
    setExporting(true)
    try {
      const data = await exportAPI.exportAll()
      const filename = `practice-more-backup-${new Date().toISOString().slice(0, 10)}.json`
      downloadJSON(data, filename)
    } catch (err) {
      alert('导出失败：' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleImportData = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const content = await readFileAsText(file)
      const data = JSON.parse(content)

      if (!data.version || !data.data) {
        throw new Error('无效的备份文件格式')
      }

      await exportAPI.importData(data)
      alert('导入成功！')
      window.location.reload()
    } catch (err) {
      alert('导入失败：' + err.message)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleClearAllData = async () => {
    if (confirm('确定要清空所有数据吗？此操作不可撤销！\n\n建议先导出备份。')) {
      if (confirm('再次确认：这将删除所有题库、刷题记录、错题本等数据。')) {
        await db.delete()
        alert('数据已清空，页面将刷新。')
        window.location.reload()
      }
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">设置</h1>

      {/* 主题设置 */}
      <section className="bg-[var(--color-card)] rounded-xl p-4 mb-6 shadow-sm">
        <h2 className="font-medium mb-4">外观</h2>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => changeTheme(value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                theme === value
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                  : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              }`}
            >
              <Icon size={24} className={theme === value ? 'text-blue-500' : 'text-[var(--color-text-secondary)]'} />
              <span className={`text-sm ${theme === value ? 'text-blue-500 font-medium' : 'text-[var(--color-text-secondary)]'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 数据管理 */}
      <section className="bg-[var(--color-card)] rounded-xl p-4 mb-6 shadow-sm">
        <h2 className="font-medium mb-4 flex items-center gap-2">
          <Database size={18} />
          数据管理
        </h2>

        <div className="space-y-3">
          {/* 导出数据 */}
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="w-full flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
          >
            <Download size={20} />
            <div className="text-left">
              <div className="font-medium">导出全部数据</div>
              <div className="text-xs opacity-70">备份题库、记录、错题等</div>
            </div>
          </button>

          {/* 导入数据 */}
          <label className="block">
            <div className={`w-full flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer ${importing ? 'opacity-50' : ''}`}>
              <Upload size={20} />
              <div className="text-left">
                <div className="font-medium">{importing ? '导入中...' : '导入数据'}</div>
                <div className="text-xs opacity-70">从备份文件恢复</div>
              </div>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              disabled={importing}
              className="hidden"
            />
          </label>

          {/* 清空数据 */}
          <button
            onClick={handleClearAllData}
            className="w-full flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={20} />
            <div className="text-left">
              <div className="font-medium">清空所有数据</div>
              <div className="text-xs opacity-70">删除全部本地数据</div>
            </div>
          </button>
        </div>
      </section>

      {/* 关于 */}
      <section className="bg-[var(--color-card)] rounded-xl p-4 shadow-sm">
        <h2 className="font-medium mb-3">关于</h2>
        <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
          <p>刷题助手 v1.0.0</p>
          <p>一个简洁的本地刷题工具</p>
          <p className="text-xs">数据存储在浏览器 IndexedDB 中，请定期备份</p>
        </div>
      </section>
    </div>
  )
}
