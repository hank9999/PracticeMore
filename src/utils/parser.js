/**
 * TXT 题目智能解析器
 * 支持单选题、多选题、判断题的智能识别
 */

// 题型关键词
const TYPE_KEYWORDS = {
  single: ['单选题', '单项选择', '单选'],
  multiple: ['多选题', '多项选择', '多选', '不定项选择'],
  judge: ['判断题', '判断', '是非题']
}

// 判断题选项模式
const JUDGE_PATTERNS = [
  ['对', '错'],
  ['正确', '错误'],
  ['√', '×'],
  ['是', '否'],
  ['A', 'B'], // 有些判断题用 A=对 B=错
]

/**
 * 检测当前题目的题型（从题目头部信息）
 */
function detectTypeFromHeader(text) {
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return type
      }
    }
  }
  return null
}

/**
 * 智能判断题型（基于选项和答案）
 */
function detectTypeFromContent(options, answer) {
  // 检查是否是判断题（选项数量为2且符合判断题模式）
  if (options.length === 2) {
    const optionTexts = options.map(o => o.text.trim())
    for (const pattern of JUDGE_PATTERNS) {
      if (
        (optionTexts[0] === pattern[0] && optionTexts[1] === pattern[1]) ||
        (optionTexts[0] === pattern[1] && optionTexts[1] === pattern[0])
      ) {
        return 'judge'
      }
    }
  }

  // 检查答案是否为多选（多个字母）
  const answerLetters = answer.toUpperCase().replace(/[^A-Z]/g, '')
  if (answerLetters.length > 1) {
    return 'multiple'
  }

  // 默认为单选题
  return 'single'
}

/**
 * 解析选项
 */
function parseOptions(lines, startIndex) {
  const options = []
  const optionPattern = /^([A-Z])[.、．:：\s]\s*(.+)/i

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()

    // 遇到 "我的答案" 或 "正确答案" 或下一题，停止解析选项
    if (/^(?:我的答案|正确答案)/.test(line) || /^\d+[.、．\s]/.test(line)) {
      break
    }

    const match = line.match(optionPattern)
    if (match) {
      options.push({
        key: match[1].toUpperCase(),
        text: match[2].trim()
      })
    } else if (options.length > 0 && line) {
      // 如果是选项的续行（前一行选项内容的延续）
      options[options.length - 1].text += ' ' + line
    }
  }

  return options
}

/**
 * 解析单道题目
 */
function parseQuestion(text, currentType) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)

  if (lines.length === 0) return null

  // 解析题目内容
  let content = ''
  let optionStartIndex = 0

  // 查找题目内容（从第一行到选项开始前）
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 检查是否是选项开始
    if (/^[A-Z][.、．:：\s]/i.test(line)) {
      optionStartIndex = i
      break
    }

    // 跳过题号和题型标记
    const cleanLine = line
      .replace(/^\d+[.、．\s]*/, '') // 移除题号
      .replace(/\([单多判][选断]题[,，]\s*[\d.]+\s*分\)\s*/g, '') // 移除题型标记
      .trim()

    if (cleanLine) {
      content += (content ? ' ' : '') + cleanLine
    }
  }

  // 解析选项
  const options = parseOptions(lines, optionStartIndex)

  // 解析答案（支持 "我的答案" 和 "正确答案" 两种格式）
  let answer = ''
  for (const line of lines) {
    const answerMatch = line.match(/(?:我的答案|正确答案)[:：]?\s*([A-Z]+)/i)
    if (answerMatch) {
      answer = answerMatch[1].toUpperCase()
      break
    }
  }

  if (!content || !answer) return null

  // 智能检测题型
  let type = currentType
  if (!type) {
    type = detectTypeFromContent(options, answer)
  }

  // 对于判断题，确保选项存在
  if (type === 'judge' && options.length === 0) {
    // 为没有选项的判断题添加默认选项
    options.push({ key: 'A', text: '正确' })
    options.push({ key: 'B', text: '错误' })
  }

  return {
    type,
    content,
    options,
    answer: type === 'multiple' ? answer.split('') : answer
  }
}

/**
 * 解析完整的 TXT 文件
 */
export function parseTxtFile(text) {
  const questions = []
  let currentType = null

  // 预处理：在答案后紧跟题号的地方插入换行
  // 例如：我的答案:A  9. -> 我的答案:A\n9.
  // 例如：正确答案:B   4. -> 正确答案:B\n4.
  const preprocessedText = text.replace(
    /((?:我的答案|正确答案)[:：]?\s*[A-Z]+)\s+(\d+[.、．]\s*)/gi,
    '$1\n$2'
  )

  // 按题目分割
  // 支持格式：1. 或 1、或 1. (单选题, 2.0 分) 等
  const questionBlocks = preprocessedText.split(/(?=\n\d+[.、．]\s*)/g)

  for (const block of questionBlocks) {
    const trimmedBlock = block.trim()
    if (!trimmedBlock) continue

    // 检测题型（从标题行）
    // 例如：一. 单选题（共 50 题，100.0 分）
    const typeFromHeader = detectTypeFromHeader(trimmedBlock)
    if (typeFromHeader) {
      currentType = typeFromHeader
    }

    // 检查是否是章节标题（非题目内容）
    if (/^[一二三四五六七八九十]+[.、．]/.test(trimmedBlock)) {
      continue
    }

    // 解析题目
    const question = parseQuestion(trimmedBlock, currentType)
    if (question) {
      questions.push(question)
    }
  }

  return questions
}

/**
 * 验证解析结果
 */
export function validateQuestions(questions) {
  const errors = []
  const warnings = []

  questions.forEach((q, index) => {
    if (!q.content) {
      errors.push(`第 ${index + 1} 题：题目内容为空`)
    }
    if (!q.answer || (Array.isArray(q.answer) && q.answer.length === 0)) {
      errors.push(`第 ${index + 1} 题：答案为空`)
    }
    if (q.type !== 'judge' && q.options.length < 2) {
      warnings.push(`第 ${index + 1} 题：选项数量少于 2`)
    }
    if (q.type === 'single' && Array.isArray(q.answer) && q.answer.length > 1) {
      warnings.push(`第 ${index + 1} 题：单选题但答案包含多个选项`)
    }
  })

  return { errors, warnings, isValid: errors.length === 0 }
}

/**
 * 获取题型统计
 */
export function getTypeStats(questions) {
  return {
    total: questions.length,
    single: questions.filter(q => q.type === 'single').length,
    multiple: questions.filter(q => q.type === 'multiple').length,
    judge: questions.filter(q => q.type === 'judge').length
  }
}
