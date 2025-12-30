import { useState, useEffect } from 'react'
import { Star, Trash2, Play } from 'lucide-react'
import { questionAPI, questionBankAPI } from '../db'
import { TYPE_NAMES } from '../utils/helpers'

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([])
  const [banks, setBanks] = useState([])
  const [selectedBank, setSelectedBank] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedBank])

  const loadData = async () => {
    setLoading(true)
    try {
      const banksData = await questionBankAPI.getAll()
      setBanks(banksData)

      let favData
      if (selectedBank === 'all') {
        favData = await questionAPI.getFavorites()
      } else {
        favData = await questionAPI.getFavorites(Number(selectedBank))
      }

      // 添加题库名称
      const favsWithBank = favData.map(q => ({
        ...q,
        bankName: banksData.find(b => b.id === q.bankId)?.name || '未知题库'
      }))

      setFavorites(favsWithBank)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async (questionId) => {
    await questionAPI.toggleFavorite(questionId)
    setFavorites(prev => prev.filter(q => q.id !== questionId))
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
      <h1 className="text-2xl font-bold mb-6">我的收藏</h1>

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

      {favorites.length === 0 ? (
        <div className="bg-[var(--color-card)] rounded-xl p-8 text-center">
          <Star size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            还没有收藏任何题目
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            在刷题时点击星标即可收藏
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            共收藏 {favorites.length} 道题目
          </p>

          <div className="space-y-3">
            {favorites.map((q) => (
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
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {q.bankName}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2">{q.content}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      答案: {Array.isArray(q.answer) ? q.answer.join('') : q.answer}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleFavorite(q.id)}
                    className="p-2 text-yellow-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                  >
                    <Star size={18} fill="currentColor" />
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
