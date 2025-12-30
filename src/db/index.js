import Dexie from 'dexie'

export const db = new Dexie('PracticeMoreDB')

db.version(1).stores({
  questionBanks: '++id, name, createdAt',
  questions: '++id, bankId, type, isFavorite, orderIndex',
  practiceRecords: '++id, questionId, bankId, isCorrect, createdAt',
  wrongQuestions: '++id, questionId, bankId, wrongCount, lastWrongAt',
  settings: 'key'
})

// 题库操作
export const questionBankAPI = {
  async create(name) {
    const id = await db.questionBanks.add({
      name,
      createdAt: Date.now(),
      questionCount: 0
    })
    return id
  },

  async getAll() {
    return await db.questionBanks.orderBy('createdAt').reverse().toArray()
  },

  async getById(id) {
    return await db.questionBanks.get(id)
  },

  async update(id, data) {
    return await db.questionBanks.update(id, data)
  },

  async delete(id) {
    await db.transaction('rw', [db.questionBanks, db.questions, db.practiceRecords, db.wrongQuestions], async () => {
      await db.questions.where('bankId').equals(id).delete()
      await db.practiceRecords.where('bankId').equals(id).delete()
      await db.wrongQuestions.where('bankId').equals(id).delete()
      await db.questionBanks.delete(id)
    })
  }
}

// 题目操作
export const questionAPI = {
  async bulkAdd(bankId, questions) {
    const questionsWithBankId = questions.map((q, index) => ({
      ...q,
      bankId,
      orderIndex: index,
      isFavorite: false
    }))
    await db.questions.bulkAdd(questionsWithBankId)
    await db.questionBanks.update(bankId, { questionCount: questions.length })
  },

  async getByBankId(bankId) {
    return await db.questions.where('bankId').equals(bankId).sortBy('orderIndex')
  },

  async getById(id) {
    return await db.questions.get(id)
  },

  async toggleFavorite(id) {
    const question = await db.questions.get(id)
    if (question) {
      await db.questions.update(id, { isFavorite: !question.isFavorite })
      return !question.isFavorite
    }
    return false
  },

  async getFavorites(bankId = null) {
    if (bankId) {
      return await db.questions.where({ bankId, isFavorite: true }).toArray()
    }
    return await db.questions.where('isFavorite').equals(true).toArray()
  },

  async getRandomQuestions(bankId, count) {
    const questions = await db.questions.where('bankId').equals(bankId).toArray()
    const shuffled = questions.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }
}

// 刷题记录操作
export const practiceRecordAPI = {
  async add(record) {
    return await db.practiceRecords.add({
      ...record,
      createdAt: Date.now()
    })
  },

  async getByBankId(bankId) {
    return await db.practiceRecords.where('bankId').equals(bankId).reverse().sortBy('createdAt')
  },

  async getAll() {
    return await db.practiceRecords.orderBy('createdAt').reverse().toArray()
  },

  async getStats(bankId = null) {
    let records
    if (bankId) {
      records = await db.practiceRecords.where('bankId').equals(bankId).toArray()
    } else {
      records = await db.practiceRecords.toArray()
    }

    const total = records.length
    const correct = records.filter(r => r.isCorrect).length
    const totalTime = records.reduce((sum, r) => sum + (r.timeSpent || 0), 0)

    return {
      total,
      correct,
      wrong: total - correct,
      accuracy: total > 0 ? (correct / total * 100).toFixed(1) : 0,
      totalTime
    }
  },

  async getTodayStats(bankId = null) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startOfDay = today.getTime()

    let records = await db.practiceRecords.where('createdAt').above(startOfDay).toArray()
    if (bankId) {
      records = records.filter(r => r.bankId === bankId)
    }

    const total = records.length
    const correct = records.filter(r => r.isCorrect).length

    return {
      total,
      correct,
      wrong: total - correct,
      accuracy: total > 0 ? (correct / total * 100).toFixed(1) : 0
    }
  }
}

// 错题操作
export const wrongQuestionAPI = {
  async add(questionId, bankId) {
    const existing = await db.wrongQuestions.where({ questionId }).first()
    if (existing) {
      await db.wrongQuestions.update(existing.id, {
        wrongCount: existing.wrongCount + 1,
        lastWrongAt: Date.now()
      })
    } else {
      await db.wrongQuestions.add({
        questionId,
        bankId,
        wrongCount: 1,
        lastWrongAt: Date.now(),
        createdAt: Date.now()
      })
    }
  },

  async remove(questionId) {
    await db.wrongQuestions.where('questionId').equals(questionId).delete()
  },

  async getByBankId(bankId) {
    const wrongRecords = await db.wrongQuestions.where('bankId').equals(bankId).toArray()
    const questionIds = wrongRecords.map(r => r.questionId)
    const questions = await db.questions.where('id').anyOf(questionIds).toArray()

    return questions.map(q => ({
      ...q,
      wrongInfo: wrongRecords.find(r => r.questionId === q.id)
    }))
  },

  async getAll() {
    const wrongRecords = await db.wrongQuestions.toArray()
    const questionIds = wrongRecords.map(r => r.questionId)
    const questions = await db.questions.where('id').anyOf(questionIds).toArray()

    return questions.map(q => ({
      ...q,
      wrongInfo: wrongRecords.find(r => r.questionId === q.id)
    }))
  },

  async getCount(bankId = null) {
    if (bankId) {
      return await db.wrongQuestions.where('bankId').equals(bankId).count()
    }
    return await db.wrongQuestions.count()
  }
}

// 设置操作
export const settingsAPI = {
  async get(key, defaultValue = null) {
    const setting = await db.settings.get(key)
    return setting ? setting.value : defaultValue
  },

  async set(key, value) {
    await db.settings.put({ key, value })
  }
}

// 导出功能
export const exportAPI = {
  async exportAll() {
    const questionBanks = await db.questionBanks.toArray()
    const questions = await db.questions.toArray()
    const practiceRecords = await db.practiceRecords.toArray()
    const wrongQuestions = await db.wrongQuestions.toArray()
    const settings = await db.settings.toArray()

    return {
      version: 1,
      exportedAt: Date.now(),
      data: {
        questionBanks,
        questions,
        practiceRecords,
        wrongQuestions,
        settings
      }
    }
  },

  async exportBankData(bankId) {
    const bank = await db.questionBanks.get(bankId)
    const questions = await db.questions.where('bankId').equals(bankId).toArray()
    const practiceRecords = await db.practiceRecords.where('bankId').equals(bankId).toArray()
    const wrongQuestions = await db.wrongQuestions.where('bankId').equals(bankId).toArray()

    return {
      version: 1,
      exportedAt: Date.now(),
      data: {
        questionBank: bank,
        questions,
        practiceRecords,
        wrongQuestions
      }
    }
  },

  async importData(jsonData) {
    const { data } = jsonData

    await db.transaction('rw', [db.questionBanks, db.questions, db.practiceRecords, db.wrongQuestions, db.settings], async () => {
      if (data.questionBanks) {
        await db.questionBanks.bulkPut(data.questionBanks)
      }
      if (data.questions) {
        await db.questions.bulkPut(data.questions)
      }
      if (data.practiceRecords) {
        await db.practiceRecords.bulkPut(data.practiceRecords)
      }
      if (data.wrongQuestions) {
        await db.wrongQuestions.bulkPut(data.wrongQuestions)
      }
      if (data.settings) {
        await db.settings.bulkPut(data.settings)
      }
    })
  }
}
