import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Upload, Trash2, Play, Shuffle, ChevronRight, BookOpen, Eye, RotateCcw } from 'lucide-react'
import { questionBankAPI, practiceRecordAPI, wrongQuestionAPI, sessionAPI, memorizeSessionAPI } from '../db'
import { formatDate } from '../utils/helpers'

export default function HomePage() {
  const [banks, setBanks] = useState([])
  const [stats, setStats] = useState({ total: 0, correct: 0, wrong: 0, accuracy: 0 })
  const [todayStats, setTodayStats] = useState({ total: 0, correct: 0 })
  const [wrongCount, setWrongCount] = useState(0)
  const [sessions, setSessions] = useState({}) // bankId -> session (刷题)
  const [memorizeSessions, setMemorizeSessions] = useState({}) // bankId -> session (背题)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [banksData, statsData, todayData, wrongData, activePractice, activeMemorize] = await Promise.all([
        questionBankAPI.getAll(),
        practiceRecordAPI.getStats(),
        practiceRecordAPI.getTodayStats(),
        wrongQuestionAPI.getCount(),
        sessionAPI.getAllActive(),
        memorizeSessionAPI.getAllActive()
      ])
      setBanks(banksData)
      setStats(statsData)
      setTodayStats(todayData)
      setWrongCount(wrongData)

      // 刷题会话映射
      const practiceMap = {}
      activePractice.forEach(s => {
        practiceMap[s.bankId] = s
      })
      setSessions(practiceMap)

      // 背题会话映射
      const memorizeMap = {}
      activeMemorize.forEach(s => {
        memorizeMap[s.bankId] = s
      })
      setMemorizeSessions(memorizeMap)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (confirm('确定要删除这个题库吗？相关的刷题记录和错题也会被删除。')) {
      await questionBankAPI.delete(id)
      // 同时删除刷题和背题会话
      await sessionAPI.delete(id)
      await memorizeSessionAPI.delete(id)
      loadData()
    }
  }

  const startPractice = (bankId, mode) => {
    navigate(`/practice/${bankId}?mode=${mode}`)
  }

  const continuePractice = (bankId) => {
    const session = sessions[bankId]
    if (session) {
      navigate(`/practice/${bankId}?mode=${session.mode}&continue=true`)
    }
  }

  const startMemorize = (bankId) => {
    navigate(`/memorize/${bankId}`)
  }

  const continueMemorize = (bankId) => {
    const session = memorizeSessions[bankId]
    if (session) {
      navigate(`/memorize/${bankId}?mode=${session.mode}&continue=true`)
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
      {/* 头部标题 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">刷题助手</h1>
        <Link
          to="/import"
          className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} />
          <span>导入题库</span>
        </Link>
      </div>

      {/* 统计面板 */}
      <div className="bg-[var(--color-card)] rounded-xl p-4 mb-6 shadow-sm">
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">学习统计</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.total}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">总做题</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{stats.correct}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">正确</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{wrongCount}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">错题</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.accuracy}%</div>
            <div className="text-xs text-[var(--color-text-secondary)]">正确率</div>
          </div>
        </div>

        {/* 今日统计 */}
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--color-text-secondary)]">今日刷题</span>
            <span className="font-medium">
              {todayStats.total} 题，正确 {todayStats.correct} 题
            </span>
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      {wrongCount > 0 && (
        <Link
          to="/wrong"
          className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <BookOpen size={20} className="text-red-500" />
            </div>
            <div>
              <div className="font-medium text-red-600 dark:text-red-400">错题本</div>
              <div className="text-sm text-red-500/70">{wrongCount} 道错题等待复习</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-red-400" />
        </Link>
      )}

      {/* 题库列表 */}
      <div>
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">我的题库</h2>
        {banks.length === 0 ? (
          <div className="bg-[var(--color-card)] rounded-xl p-8 text-center">
            <Upload size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-[var(--color-text-secondary)] mb-4">还没有题库，点击导入开始学习</p>
            <Link
              to="/import"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Upload size={18} />
              导入题库
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {banks.map((bank) => {
              const practiceSession = sessions[bank.id]
              const memorizeSession = memorizeSessions[bank.id]
              const hasPracticeSession = practiceSession && practiceSession.currentIndex > 0
              const hasMemorizeSession = memorizeSession && memorizeSession.currentIndex > 0

              return (
                <div
                  key={bank.id}
                  className="bg-[var(--color-card)] rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-[var(--color-text)]">{bank.name}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {bank.questionCount} 题 · {formatDate(bank.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(bank.id, e)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* 继续刷题入口 */}
                  {hasPracticeSession && (
                    <button
                      onClick={() => continuePractice(bank.id)}
                      className="w-full flex items-center justify-between mb-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <RotateCcw size={18} className="text-orange-500" />
                        <span className="font-medium text-orange-600 dark:text-orange-400">继续刷题</span>
                      </div>
                      <span className="text-sm text-orange-500">
                        {practiceSession.currentIndex + 1}/{practiceSession.questionIds?.length || bank.questionCount} · {practiceSession.mode === 'random' ? '随机' : '顺序'}
                      </span>
                    </button>
                  )}

                  {/* 继续背题入口 */}
                  {hasMemorizeSession && (
                    <button
                      onClick={() => continueMemorize(bank.id)}
                      className="w-full flex items-center justify-between mb-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <RotateCcw size={18} className="text-purple-500" />
                        <span className="font-medium text-purple-600 dark:text-purple-400">继续背题</span>
                      </div>
                      <span className="text-sm text-purple-500">
                        {memorizeSession.currentIndex + 1}/{memorizeSession.questionIds?.length || bank.questionCount} · {memorizeSession.mode === 'random' ? '随机' : '顺序'}
                      </span>
                    </button>
                  )}

                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => startPractice(bank.id, 'sequence')}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <Play size={16} />
                      顺序刷题
                    </button>
                    <button
                      onClick={() => startPractice(bank.id, 'random')}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                    >
                      <Shuffle size={16} />
                      随机刷题
                    </button>
                  </div>
                  <button
                    onClick={() => startMemorize(bank.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                  >
                    <Eye size={16} />
                    背题模式
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
