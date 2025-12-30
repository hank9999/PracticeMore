import { useState, useEffect } from 'react'
import { Clock, Check, X, Trash2 } from 'lucide-react'
import { practiceRecordAPI, questionAPI, questionBankAPI, db } from '../db'
import { formatDate, formatTime, TYPE_NAMES } from '../utils/helpers'

export default function HistoryPage() {
  const [records, setRecords] = useState([])
  const [banks, setBanks] = useState([])
  const [selectedBank, setSelectedBank] = useState('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadData()
  }, [selectedBank])

  const loadData = async () => {
    setLoading(true)
    try {
      const banksData = await questionBankAPI.getAll()
      setBanks(banksData)

      // 获取记录
      let recordsData
      if (selectedBank === 'all') {
        recordsData = await practiceRecordAPI.getAll()
      } else {
        recordsData = await practiceRecordAPI.getByBankId(Number(selectedBank))
      }

      // 获取对应的题目信息
      const questionIds = [...new Set(recordsData.map(r => r.questionId))]
      const questions = await db.questions.where('id').anyOf(questionIds).toArray()
      const questionMap = new Map(questions.map(q => [q.id, q]))

      // 合并数据
      const recordsWithQuestion = recordsData.map(r => ({
        ...r,
        question: questionMap.get(r.questionId),
        bankName: banksData.find(b => b.id === r.bankId)?.name || '未知题库'
      })).filter(r => r.question) // 过滤掉已删除的题目

      setRecords(recordsWithQuestion)

      // 统计数据
      const statsData = selectedBank === 'all'
        ? await practiceRecordAPI.getStats()
        : await practiceRecordAPI.getStats(Number(selectedBank))
      setStats(statsData)
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    if (confirm('确定要清空所有刷题记录吗？这不会影响错题本。')) {
      await db.practiceRecords.clear()
      setRecords([])
      setStats({ total: 0, correct: 0, wrong: 0, accuracy: 0 })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">刷题历史</h1>
        {records.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-sm text-red-500 hover:text-red-600"
          >
            清空记录
          </button>
        )}
      </div>

      {/* 统计信息 */}
      {stats && stats.total > 0 && (
        <div className="bg-[var(--color-card)] rounded-xl p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-500">{stats.total}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">总题数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{stats.correct}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">正确</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{stats.wrong}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">错误</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500">{stats.accuracy}%</div>
              <div className="text-xs text-[var(--color-text-secondary)]">正确率</div>
            </div>
          </div>
          {stats.totalTime > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-text-secondary)]">
              总用时: {formatTime(stats.totalTime)}
            </div>
          )}
        </div>
      )}

      {/* 题库筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        <button
          onClick={() => setSelectedBank('all')}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            selectedBank === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-[var(--color-card)] text-[var(--color-text-secondary)]'
          }`}
        >
          全部记录
        </button>
        {banks.map(bank => (
          <button
            key={bank.id}
            onClick={() => setSelectedBank(bank.id.toString())}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedBank === bank.id.toString()
                ? 'bg-blue-500 text-white'
                : 'bg-[var(--color-card)] text-[var(--color-text-secondary)]'
            }`}
          >
            {bank.name}
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="bg-[var(--color-card)] rounded-xl p-8 text-center">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            还没有刷题记录
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.slice(0, 50).map((record) => (
            <div
              key={record.id}
              className="bg-[var(--color-card)] rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  record.isCorrect
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-500'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-500'
                }`}>
                  {record.isCorrect ? <Check size={16} /> : <X size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      {TYPE_NAMES[record.question?.type]}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {record.bankName}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2">{record.question?.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-secondary)]">
                    <span>你的答案: {Array.isArray(record.userAnswer) ? record.userAnswer.join('') : record.userAnswer}</span>
                    {!record.isCorrect && (
                      <span className="text-green-600">
                        正确: {Array.isArray(record.question?.answer) ? record.question.answer.join('') : record.question?.answer}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {formatDate(record.createdAt)}
                    {record.timeSpent > 0 && ` · 用时 ${formatTime(record.timeSpent)}`}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {records.length > 50 && (
            <p className="text-center text-sm text-[var(--color-text-secondary)] py-4">
              仅显示最近 50 条记录
            </p>
          )}
        </div>
      )}
    </div>
  )
}
