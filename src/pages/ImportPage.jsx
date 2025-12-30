import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { questionBankAPI, questionAPI } from '../db'
import { parseTxtFile, validateQuestions, getTypeStats } from '../utils/parser'
import { readFileAsText, TYPE_NAMES } from '../utils/helpers'

export default function ImportPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('upload') // upload | preview | success
  const [bankName, setBankName] = useState('')
  const [questions, setQuestions] = useState([])
  const [validation, setValidation] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    try {
      const content = await readFileAsText(file)
      const parsed = parseTxtFile(content)

      if (parsed.length === 0) {
        setError('未能解析出任何题目，请检查文件格式')
        return
      }

      const validationResult = validateQuestions(parsed)
      const typeStats = getTypeStats(parsed)

      setQuestions(parsed)
      setValidation(validationResult)
      setStats(typeStats)
      setBankName(file.name.replace(/\.[^/.]+$/, ''))
      setStep('preview')
    } catch (err) {
      setError('文件读取失败：' + err.message)
    }
  }

  const handleImport = async () => {
    if (!bankName.trim()) {
      setError('请输入题库名称')
      return
    }

    setImporting(true)
    try {
      const bankId = await questionBankAPI.create(bankName.trim())
      await questionAPI.bulkAdd(bankId, questions)
      setStep('success')
    } catch (err) {
      setError('导入失败：' + err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step === 'upload' ? navigate('/') : setStep('upload')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">导入题库</h1>
      </div>

      {step === 'upload' && (
        <div className="space-y-6">
          {/* 文件上传区域 */}
          <label className="block">
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all">
              <Upload size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-[var(--color-text)] font-medium mb-2">点击上传 TXT 文件</p>
              <p className="text-sm text-[var(--color-text-secondary)]">支持单选题、多选题、判断题自动识别</p>
            </div>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 格式说明 */}
          <div className="bg-[var(--color-card)] rounded-xl p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <FileText size={18} />
              支持的格式示例
            </h3>
            <pre className="text-xs text-[var(--color-text-secondary)] bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
{`一. 单选题（共 50 题，100.0 分）
1. (单选题, 2.0 分) 题目内容...
A. 选项A
B. 选项B
C. 选项C
D. 选项D
我的答案:B

二. 多选题（共 10 题）
1. (多选题, 3.0 分) 题目内容...
A. 选项A
B. 选项B
C. 选项C
我的答案:ABC

三. 判断题
1. (判断题) 题目内容...
A. 正确
B. 错误
我的答案:A`}
            </pre>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          {/* 题库名称 */}
          <div>
            <label className="block text-sm font-medium mb-2">题库名称</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入题库名称"
            />
          </div>

          {/* 解析统计 */}
          <div className="bg-[var(--color-card)] rounded-xl p-4">
            <h3 className="font-medium mb-3">解析结果</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-500">{stats?.total || 0}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">总题数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">{stats?.single || 0}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">单选题</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500">{stats?.multiple || 0}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">多选题</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-500">{stats?.judge || 0}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">判断题</div>
              </div>
            </div>
          </div>

          {/* 验证警告 */}
          {validation?.warnings?.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-medium text-yellow-700 dark:text-yellow-400 mb-2">提示</h4>
              <ul className="text-sm text-yellow-600 dark:text-yellow-500 space-y-1">
                {validation.warnings.slice(0, 5).map((w, i) => (
                  <li key={i}>· {w}</li>
                ))}
                {validation.warnings.length > 5 && (
                  <li>· 还有 {validation.warnings.length - 5} 条提示...</li>
                )}
              </ul>
            </div>
          )}

          {/* 预览题目 */}
          <div className="bg-[var(--color-card)] rounded-xl p-4">
            <h3 className="font-medium mb-3">题目预览（前3题）</h3>
            <div className="space-y-4">
              {questions.slice(0, 3).map((q, index) => (
                <div key={index} className="text-sm border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      {TYPE_NAMES[q.type]}
                    </span>
                    <span className="text-[var(--color-text-secondary)]">第 {index + 1} 题</span>
                  </div>
                  <p className="text-[var(--color-text)] line-clamp-2">{q.content}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    答案: {Array.isArray(q.answer) ? q.answer.join('') : q.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('upload')}
              className="flex-1 py-3 border border-[var(--color-border)] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              重新选择
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {importing ? '导入中...' : '确认导入'}
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">导入成功！</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            已导入 {questions.length} 道题目
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            返回首页开始刷题
          </button>
        </div>
      )}
    </div>
  )
}
