import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Trash2, Check, RefreshCw } from 'lucide-react'
import { wrongQuestionAPI, questionBankAPI, questionAPI, practiceRecordAPI } from '../db'
import QuestionCard from '../components/QuestionCard'
import { TYPE_NAMES } from '../utils/helpers'

export default function WrongPage() {
  const navigate = useNavigate()
  const [wrongQuestions, setWrongQuestions] = useState([])
  const [banks, setBanks] = useState([])
  const [selectedBank, setSelectedBank] = useState('all')
  const [loading, setLoading] = useState(true)
  const [reviewMode, setReviewMode] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState(null)

  useEffect(() => {
    loadData()
  }, [selectedBank])

  const loadData = async () => {
    setLoading(true)
    try {
      const banksData = await questionBankAPI.getAll()
      setBanks(banksData)

      let wrongData
      if (selectedBank === 'all') {
        wrongData = await wrongQuestionAPI.getAll()
      } else {
        wrongData = await wrongQuestionAPI.getByBankId(Number(selectedBank))
      }
      setWrongQuestions(wrongData)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (questionId) => {
    await wrongQuestionAPI.remove(questionId)
    setWrongQuestions(prev => prev.filter(q => q.id !== questionId))
  }

  const handleClearAll = async () => {
    if (confirm('确定要清空所有错题吗？')) {
      for (const q of wrongQuestions) {
        await wrongQuestionAPI.remove(q.id)
      }
      setWrongQuestions([])
    }
  }

  const startReview = () => {
    if (wrongQuestions.length === 0) return
    setReviewMode(true)
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setShowResult(false)
  }

  const handleSubmit = async (directAnswer) => {
    const answerToSubmit = directAnswer || selectedAnswer
    if (!answerToSubmit) return

    const question = wrongQuestions[currentIndex]
    const { type, answer } = question

    let isCorrect = false
    if (type === 'multiple') {
      const userAnswer = [...(answerToSubmit || [])].sort().join('')
      const correctAnswer = [...answer].sort().join('')
      isCorrect = userAnswer === correctAnswer
    } else {
      isCorrect = answerToSubmit === answer
    }

    setShowResult(true)

    // 保存刷题记录
    await practiceRecordAPI.add({
      questionId: question.id,
      bankId: question.bankId,
      userAnswer: answerToSubmit,
      isCorrect,
      timeSpent: 0
    })

    // 如果答对了，标记待删除（等用户点击下一题时再删除）
    if (isCorrect) {
      setPendingRemoveId(question.id)
    }
  }

  const handleNext = () => {
    // 如果有待删除的题目，先执行删除
    if (pendingRemoveId) {
      handleRemove(pendingRemoveId)
      setPendingRemoveId(null)
      // 删除后数组变短，当前索引已指向下一题，无需调整
      // 但需要检查是否还有题目
      const remainingCount = wrongQuestions.length - 1
      if (remainingCount === 0) {
        alert('本轮错题复习完成！')
        setReviewMode(false)
      } else if (currentIndex >= remainingCount) {
        // 如果删除的是最后一题，回到第一题或结束
        alert('本轮错题复习完成！')
        setReviewMode(false)
      }
      setSelectedAnswer(null)
      setShowResult(false)
      return
    }

    setSelectedAnswer(null)
    setShowResult(false)

    // 检查是否还有题目
    if (wrongQuestions.length === 0) {
      setReviewMode(false)
      return
    }

    // 如果还有下一题
    if (currentIndex < wrongQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      // 最后一题，完成复习
      alert('本轮错题复习完成！')
      setReviewMode(false)
    }
  }

  const handleToggleFavorite = async (questionId) => {
    const newStatus = await questionAPI.toggleFavorite(questionId)
    setWrongQuestions(prev =>
      prev.map(q =>
        q.id === questionId ? { ...q, isFavorite: newStatus } : q
      )
    )
  }

  // 键盘快捷键（仅在复习模式下生效）
  useEffect(() => {
    if (!reviewMode) return

    const currentQuestion = wrongQuestions[currentIndex]
    if (!currentQuestion) return

    const handleKeyDown = (e) => {
      // 数字键 1-9 对应选项 A-I
      if (e.key >= '1' && e.key <= '9' && !showResult) {
        const optionIndex = parseInt(e.key) - 1
        const optionKey = String.fromCharCode(65 + optionIndex) // 65 是 'A' 的 ASCII 码
        const optionExists = currentQuestion.options.some(opt => opt.key === optionKey)

        if (optionExists) {
          if (currentQuestion.type === 'multiple') {
            // 多选题：切换选中状态
            const current = selectedAnswer || []
            if (current.includes(optionKey)) {
              setSelectedAnswer(current.filter(k => k !== optionKey))
            } else {
              setSelectedAnswer([...current, optionKey].sort())
            }
          } else {
            // 单选题：选择后自动提交
            setSelectedAnswer(optionKey)
            handleSubmit(optionKey)
          }
        }
      }

      // 回车键：多选题确认答案
      if (e.key === 'Enter' && !showResult && currentQuestion.type === 'multiple') {
        if (selectedAnswer && selectedAnswer.length > 0) {
          handleSubmit()
        }
      }

      // 右箭头或回车：下一题（仅在显示结果后）
      if ((e.key === 'ArrowRight' || e.key === 'Enter') && showResult) {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reviewMode, wrongQuestions, currentIndex, showResult, selectedAnswer])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // 复习模式
  if (reviewMode && wrongQuestions.length > 0) {
    const currentQuestion = wrongQuestions[currentIndex]

    if (!currentQuestion) {
      setReviewMode(false)
      return null
    }

    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
        {/* 头部 */}
        <header className="sticky top-0 z-10 bg-[var(--color-card)] border-b border-[var(--color-border)] safe-area-pt">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setReviewMode(false)}
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft size={20} className="text-[var(--color-text)]" />
            </button>
            <div className="font-medium text-[var(--color-text)]">错题复习</div>
            <div className="text-sm text-[var(--color-text-secondary)]">
              {currentIndex + 1} / {wrongQuestions.length}
            </div>
          </div>
          <div className="h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${((currentIndex + 1) / wrongQuestions.length) * 100}%` }}
            />
          </div>
        </header>

        {/* 题目 */}
        <div className="flex-1 p-4">
          <QuestionCard
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={setSelectedAnswer}
            showResult={showResult}
            onToggleFavorite={handleToggleFavorite}
          />

          {/* 错误次数提示 */}
          {currentQuestion.wrongInfo && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
              <RefreshCw size={14} className="inline mr-1" />
              已答错 {currentQuestion.wrongInfo.wrongCount} 次
            </div>
          )}
        </div>

        {/* 操作栏 */}
        <footer className="sticky bottom-16 bg-[var(--color-card)] border-t border-[var(--color-border)] p-4 safe-area-pb">
          {!showResult ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
            >
              确认答案
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium"
            >
              {currentIndex < wrongQuestions.length - 1 ? '下一题' : '完成复习'}
            </button>
          )}

          {/* 快捷键提示 */}
          <p className="text-center text-xs text-[var(--color-text-secondary)] mt-3 hidden sm:block">
            快捷键：1-9 选择选项{currentQuestion.type === 'multiple' ? '，回车确认' : ''}
            {showResult ? '，→ 或回车下一题' : ''}
          </p>
        </footer>
      </div>
    )
  }

  // 错题列表
  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">错题本</h1>
        {wrongQuestions.length > 0 && (
          <button
            onClick={startReview}
            className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Play size={18} />
            开始复习
          </button>
        )}
      </div>

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
          全部题库
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

      {wrongQuestions.length === 0 ? (
        <div className="bg-[var(--color-card)] rounded-xl p-8 text-center">
          <Check size={48} className="mx-auto text-green-400 mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            太棒了！暂无错题
          </p>
        </div>
      ) : (
        <>
          {/* 统计和操作 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--color-text-secondary)]">
              共 {wrongQuestions.length} 道错题
            </span>
            <button
              onClick={handleClearAll}
              className="text-sm text-red-500 hover:text-red-600"
            >
              清空全部
            </button>
          </div>

          {/* 错题列表 */}
          <div className="space-y-3">
            {wrongQuestions.map((q, index) => (
              <div
                key={q.id}
                className="bg-[var(--color-card)] rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                        {TYPE_NAMES[q.type]}
                      </span>
                      {q.wrongInfo && (
                        <span className="text-xs text-red-500">
                          错误 {q.wrongInfo.wrongCount} 次
                        </span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2">{q.content}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(q.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
