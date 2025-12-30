import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Star, Check, X } from 'lucide-react'
import { questionBankAPI, questionAPI, practiceRecordAPI, wrongQuestionAPI, sessionAPI } from '../db'
import QuestionCard from '../components/QuestionCard'
import { formatTime, shuffleArray } from '../utils/helpers'

export default function PracticePage() {
  const { bankId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get('mode') || 'sequence'
  const continueSession = searchParams.get('continue') === 'true'

  const [bank, setBank] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 })
  const [loading, setLoading] = useState(true)
  const [sessionRestored, setSessionRestored] = useState(false)

  const questionsRef = useRef([])

  // 保存会话进度
  const saveSession = useCallback(async (index, stats, questionList) => {
    const qs = questionList || questionsRef.current
    if (qs.length === 0) return

    console.log('[DEBUG] 保存会话:', {
      bankId: Number(bankId),
      mode,
      currentIndex: index,
      questionCount: qs.length,
      sessionStats: stats
    })

    await sessionAPI.save({
      bankId: Number(bankId),
      mode,
      currentIndex: index,
      questionIds: qs.map(q => q.id),
      sessionStats: stats
    })
  }, [bankId, mode])

  // 加载数据
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

        // 检查是否有保存的会话需要恢复
        const savedSession = await sessionAPI.get(Number(bankId))

        console.log('[DEBUG] 恢复会话检查:', {
          savedSession,
          continueSession,
          hasQuestionIds: savedSession?.questionIds?.length > 0,
          savedCurrentIndex: savedSession?.currentIndex
        })

        if (savedSession && continueSession && savedSession.questionIds?.length > 0) {
          // 恢复会话：按保存的顺序重建题目列表
          const questionMap = new Map(questionsData.map(q => [q.id, q]))
          const orderedQuestions = savedSession.questionIds
            .map(id => questionMap.get(id))
            .filter(Boolean)

          if (orderedQuestions.length > 0) {
            console.log('[DEBUG] 恢复会话:', {
              currentIndex: savedSession.currentIndex,
              questionCount: orderedQuestions.length,
              sessionStats: savedSession.sessionStats
            })
            setQuestions(orderedQuestions)
            questionsRef.current = orderedQuestions
            setCurrentIndex(savedSession.currentIndex || 0)
            setSessionStats(savedSession.sessionStats || { correct: 0, wrong: 0 })
            setSessionRestored(true)
            setLoading(false)
            return
          }
        }

        // 没有会话或不需要恢复，正常加载
        const orderedQuestions = mode === 'random'
          ? shuffleArray(questionsData)
          : questionsData

        setQuestions(orderedQuestions)
        questionsRef.current = orderedQuestions

        // 如果有旧会话但不继续，清除它
        if (savedSession) {
          await sessionAPI.delete(Number(bankId))
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [bankId, mode, navigate, continueSession])

  // 计时器
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showResult) {
        setTimeSpent(t => t + 1)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [showResult])

  // 自动保存进度（当切换题目时）
  useEffect(() => {
    if (questions.length > 0 && currentIndex > 0) {
      saveSession(currentIndex, sessionStats, questions)
    }
  }, [currentIndex, questions, sessionStats, saveSession])

  const currentQuestion = questions[currentIndex]

  // 检查答案是否正确
  const checkAnswer = useCallback(() => {
    if (!currentQuestion || !selectedAnswer) return false

    const { type, answer } = currentQuestion

    if (type === 'multiple') {
      const userAnswer = [...(selectedAnswer || [])].sort().join('')
      const correctAnswer = [...answer].sort().join('')
      return userAnswer === correctAnswer
    }

    return selectedAnswer === answer
  }, [currentQuestion, selectedAnswer])

  // 提交答案（支持传入答案，用于单选自动提交）
  const handleSubmit = async (answer) => {
    const answerToCheck = answer !== undefined ? answer : selectedAnswer
    if (!answerToCheck) return

    const isCorrect = (() => {
      const { type, answer: correctAnswer } = currentQuestion
      if (type === 'multiple') {
        const userAnswer = [...(answerToCheck || [])].sort().join('')
        const correct = [...correctAnswer].sort().join('')
        return userAnswer === correct
      }
      return answerToCheck === correctAnswer
    })()

    setShowResult(true)

    // 更新会话统计
    const newStats = {
      correct: sessionStats.correct + (isCorrect ? 1 : 0),
      wrong: sessionStats.wrong + (isCorrect ? 0 : 1)
    }
    setSessionStats(newStats)

    // 保存刷题记录
    await practiceRecordAPI.add({
      questionId: currentQuestion.id,
      bankId: Number(bankId),
      userAnswer: answerToCheck,
      isCorrect,
      timeSpent
    })

    // 如果答错，添加到错题本
    if (!isCorrect) {
      await wrongQuestionAPI.add(currentQuestion.id, Number(bankId))
    }

    // 保存会话进度
    await saveSession(currentIndex, newStats, questions)
  }

  // 下一题
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setShowResult(false)
      setTimeSpent(0)
    }
  }

  // 上一题（仅查看）
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setSelectedAnswer(null)
      setShowResult(false)
      setTimeSpent(0)
    }
  }

  // 收藏切换
  const handleToggleFavorite = async (questionId) => {
    const newStatus = await questionAPI.toggleFavorite(questionId)
    setQuestions(prev =>
      prev.map(q =>
        q.id === questionId ? { ...q, isFavorite: newStatus } : q
      )
    )
  }

  // 退出（进度已自动保存）
  const handleExit = () => {
    navigate('/')
  }

  // 完成刷题
  const handleComplete = async () => {
    // 清除会话
    await sessionAPI.delete(Number(bankId))
    navigate('/')
  }

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

  const isLastQuestion = currentIndex === questions.length - 1
  const isCorrect = showResult && checkAnswer()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-[var(--color-card)] border-b border-[var(--color-border)] safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={handleExit}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="text-center">
            <div className="font-medium">{bank?.name}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {mode === 'random' ? '随机模式' : '顺序模式'}
              {sessionRestored && ' · 已恢复进度'}
            </div>
          </div>

          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <Clock size={16} />
            <span className="text-sm font-mono">{formatTime(timeSpent)}</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      {/* 进度信息 */}
      <div className="px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-secondary)]">
          {currentIndex + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-green-500">
            <Check size={16} />
            {sessionStats.correct}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <X size={16} />
            {sessionStats.wrong}
          </span>
        </div>
      </div>

      {/* 题目内容 */}
      <div className="flex-1 px-4 pb-4">
        <QuestionCard
          question={currentQuestion}
          index={currentIndex}
          selectedAnswer={selectedAnswer}
          onSelectAnswer={setSelectedAnswer}
          showResult={showResult}
          onToggleFavorite={handleToggleFavorite}
          onAutoSubmit={handleSubmit}
        />

        {/* 答题结果反馈 */}
        {showResult && (
          <div className={`mt-4 p-4 rounded-xl ${
            isCorrect
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <Check size={20} className="text-green-500" />
                  <span className="font-medium text-green-600 dark:text-green-400">回答正确！</span>
                </>
              ) : (
                <>
                  <X size={20} className="text-red-500" />
                  <span className="font-medium text-red-600 dark:text-red-400">回答错误</span>
                </>
              )}
            </div>
            {!isCorrect && (
              <p className="text-sm text-[var(--color-text-secondary)]">
                已自动添加到错题本，记得复习哦~
              </p>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <footer className="sticky bottom-0 bg-[var(--color-card)] border-t border-[var(--color-border)] p-4 safe-area-pb">
        <div className="flex gap-3 max-w-lg mx-auto">
          {!showResult ? (
            // 多选题显示确认按钮，单选题不需要（点击即提交）
            currentQuestion.type === 'multiple' ? (
              <button
                onClick={() => handleSubmit()}
                disabled={!selectedAnswer || selectedAnswer.length === 0}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
              >
                确认答案
              </button>
            ) : (
              <div className="flex-1 py-3 text-center text-[var(--color-text-secondary)]">
                请选择答案
              </div>
            )
          ) : (
            <>
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-3 border border-[var(--color-border)] rounded-xl disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>

              {isLastQuestion ? (
                <button
                  onClick={handleComplete}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                >
                  完成刷题
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  下一题
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={isLastQuestion}
                className="p-3 border border-[var(--color-border)] rounded-xl disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
