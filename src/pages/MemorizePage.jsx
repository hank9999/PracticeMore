import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Eye, EyeOff } from 'lucide-react'
import { questionBankAPI, questionAPI } from '../db'
import { TYPE_NAMES, shuffleArray } from '../utils/helpers'

export default function MemorizePage() {
  const { bankId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get('mode') || 'sequence'

  const [bank, setBank] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bankData, questionsData] = await Promise.all([
          questionBankAPI.getById(Number(bankId)),
          questionAPI.getByBankId(Number(bankId))
        ])

        if (!bankData) {
          navigate('/')
          return
        }

        setBank(bankData)
        const orderedQuestions = mode === 'random'
          ? shuffleArray(questionsData)
          : questionsData
        setQuestions(orderedQuestions)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [bankId, mode, navigate])

  const currentQuestion = questions[currentIndex]

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handleToggleFavorite = async () => {
    if (!currentQuestion) return
    const newStatus = await questionAPI.toggleFavorite(currentQuestion.id)
    setQuestions(prev =>
      prev.map(q =>
        q.id === currentQuestion.id ? { ...q, isFavorite: newStatus } : q
      )
    )
  }

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === ' ') {
        e.preventDefault()
        setShowAnswer(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, questions.length])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-xl font-bold mb-4">没有题目</h2>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          返回首页
        </button>
      </div>
    )
  }

  const { type, content, options, answer } = currentQuestion
  const answerArray = Array.isArray(answer) ? answer : [answer]

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-[var(--color-card)] border-b border-[var(--color-border)] safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-[var(--color-text)]" />
          </button>

          <div className="text-center">
            <div className="font-medium text-[var(--color-text)]">{bank?.name}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              背题模式 · {mode === 'random' ? '随机' : '顺序'}
            </div>
          </div>

          <button
            onClick={handleToggleFavorite}
            className="p-2 -mr-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Star
              size={20}
              className={currentQuestion.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
            />
          </button>
        </div>

        {/* 进度条 */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      {/* 进度信息 */}
      <div className="px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-secondary)]">
          {currentIndex + 1} / {questions.length}
        </span>
        <button
          onClick={() => setShowAnswer(prev => !prev)}
          className="flex items-center gap-1 text-purple-500 hover:text-purple-600"
        >
          {showAnswer ? <EyeOff size={16} /> : <Eye size={16} />}
          {showAnswer ? '隐藏答案' : '显示答案'}
        </button>
      </div>

      {/* 题目内容 */}
      <div className="flex-1 px-4 pb-4">
        <div className="bg-[var(--color-card)] rounded-xl p-4 shadow-sm">
          {/* 题目头部 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              {currentIndex + 1}.
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
              {TYPE_NAMES[type]}
            </span>
          </div>

          {/* 题目内容 */}
          <p className="text-[var(--color-text)] mb-4 leading-relaxed text-lg">
            {content}
          </p>

          {/* 选项列表 */}
          <div className="space-y-2">
            {options.map((option) => {
              const isCorrect = answerArray.includes(option.key)
              return (
                <div
                  key={option.key}
                  className={`w-full p-3 rounded-lg border text-left flex items-start gap-3 transition-all ${
                    showAnswer && isCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm font-medium shrink-0 ${
                    showAnswer && isCorrect
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-[var(--color-border)]'
                  }`}>
                    {option.key}
                  </span>
                  <span className="flex-1">{option.text}</span>
                </div>
              )
            })}
          </div>

          {/* 答案提示 */}
          {showAnswer && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <div className="text-sm">
                <span className="text-[var(--color-text-secondary)]">正确答案：</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                  {answerArray.join(', ')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <footer className="sticky bottom-0 bg-[var(--color-card)] border-t border-[var(--color-border)] p-4 safe-area-pb">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-[var(--color-border)] rounded-xl disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={20} />
            上一题
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500 text-white rounded-xl disabled:opacity-50 hover:bg-purple-600 transition-colors"
          >
            下一题
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 快捷键提示 */}
        <p className="text-center text-xs text-[var(--color-text-secondary)] mt-3 hidden sm:block">
          快捷键：← → 切换题目，空格键 显示/隐藏答案
        </p>
      </footer>
    </div>
  )
}
