import { Star } from 'lucide-react'
import { TYPE_NAMES } from '../utils/helpers'

export default function QuestionCard({
  question,
  index,
  selectedAnswer,
  onSelectAnswer,
  showResult,
  onToggleFavorite,
  onAutoSubmit, // 单选自动提交回调
  mode = 'practice' // practice | review
}) {
  const { type, content, options, answer, isFavorite } = question

  const isCorrect = (optionKey) => {
    if (type === 'multiple') {
      return answer.includes(optionKey)
    }
    return answer === optionKey
  }

  const isSelected = (optionKey) => {
    if (type === 'multiple') {
      return selectedAnswer?.includes(optionKey)
    }
    return selectedAnswer === optionKey
  }

  const handleSelect = (optionKey) => {
    if (showResult) return

    if (type === 'multiple') {
      const current = selectedAnswer || []
      if (current.includes(optionKey)) {
        onSelectAnswer(current.filter(k => k !== optionKey))
      } else {
        onSelectAnswer([...current, optionKey].sort())
      }
    } else {
      // 单选：选择后立即提交
      onSelectAnswer(optionKey)
      if (onAutoSubmit) {
        onAutoSubmit(optionKey)
      }
    }
  }

  const getOptionClass = (optionKey) => {
    const base = 'w-full p-3 rounded-lg border text-left transition-all flex items-start gap-3'

    if (!showResult) {
      if (isSelected(optionKey)) {
        return `${base} border-blue-500 bg-blue-50 dark:bg-blue-900/30`
      }
      return `${base} border-[var(--color-border)] hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/20`
    }

    // 显示结果时
    if (isCorrect(optionKey)) {
      return `${base} border-green-500 bg-green-50 dark:bg-green-900/30`
    }
    if (isSelected(optionKey) && !isCorrect(optionKey)) {
      return `${base} border-red-500 bg-red-50 dark:bg-red-900/30`
    }
    return `${base} border-[var(--color-border)] opacity-60`
  }

  return (
    <div className="bg-[var(--color-card)] rounded-xl p-4 shadow-sm">
      {/* 题目头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {index !== undefined && (
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              {index + 1}.
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
            {TYPE_NAMES[type]}
          </span>
          {type === 'multiple' && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              (多选)
            </span>
          )}
        </div>
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(question.id)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Star
              size={20}
              className={isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
            />
          </button>
        )}
      </div>

      {/* 题目内容 */}
      <p className="text-[var(--color-text)] mb-4 leading-relaxed">
        {content}
      </p>

      {/* 选项列表 */}
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.key}
            onClick={() => handleSelect(option.key)}
            disabled={showResult}
            className={getOptionClass(option.key)}
          >
            <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm font-medium shrink-0 ${
              isSelected(option.key)
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-[var(--color-border)]'
            } ${
              showResult && isCorrect(option.key)
                ? 'border-green-500 bg-green-500 text-white'
                : ''
            } ${
              showResult && isSelected(option.key) && !isCorrect(option.key)
                ? 'border-red-500 bg-red-500 text-white'
                : ''
            }`}>
              {option.key}
            </span>
            <span className="flex-1">{option.text}</span>
          </button>
        ))}
      </div>

      {/* 显示正确答案 */}
      {showResult && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="text-sm">
            <span className="text-[var(--color-text-secondary)]">正确答案：</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {Array.isArray(answer) ? answer.join(', ') : answer}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
