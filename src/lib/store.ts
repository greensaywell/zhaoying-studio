import type { Project } from '@/types'

export const STORAGE_KEY = 'vn-studio-project-v1'

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

/** 读取图片文件为 dataURL（超长边压缩到 1600px 以节省存储） */
export function fileToDataURL(file: File, maxEdge = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.onload = () => {
      const url = reader.result as string
      if (!file.type.startsWith('image/')) return resolve(url)
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
        if (scale >= 1) return resolve(url)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => resolve(url)
      img.src = url
    }
    reader.readAsDataURL(file)
  })
}

/** 内置演示项目：两个角色、两个背景、三幕剧情（含分支） */
export function defaultProject(): Project {
  const c1 = uid(), c2 = uid()
  const s1a = uid(), s1b = uid(), s2a = uid(), s2b = uid()
  const bg1 = uid(), bg2 = uid(), bg3 = uid()
  const sc1 = uid(), sc2 = uid(), sc3 = uid()

  return {
    title: '星轨物语',
    bgms: [],
    characters: [
      {
        id: c1,
        name: '林晚星',
        title: '天文社社长 · 冷静的外表下藏着温柔',
        color: '#D1D0EA',
        sprites: [
          { id: s1a, name: '默认', image: null },
          { id: s1b, name: '微笑', image: null },
        ],
      },
      {
        id: c2,
        name: '江燃',
        title: '转学生 · 总是带着耳机',
        color: '#FF6B35',
        sprites: [
          { id: s2a, name: '默认', image: null },
          { id: s2b, name: '认真', image: null },
        ],
      },
    ],
    backgrounds: [
      { id: bg1, name: '黄昏天台', kind: 'gradient', gradient: 'linear-gradient(180deg, #2b1a4a 0%, #7a3a6e 45%, #e8663c 80%, #f7a84c 100%)' },
      { id: bg2, name: '深夜教室', kind: 'gradient', gradient: 'linear-gradient(180deg, #0b0e1d 0%, #1b2547 60%, #33415e 100%)' },
      { id: bg3, name: '星空', kind: 'gradient', gradient: 'radial-gradient(ellipse at 50% 120%, #442369 0%, #14101f 55%, #05030a 100%)' },
    ],
    scenes: [
      {
        id: sc1,
        title: '第一幕 · 天台的相遇',
        backgroundId: bg1,
        bgmId: null,
        beats: [
          { id: uid(), kind: 'dialogue', characterId: null, spriteId: null, position: 'center', text: '放学后的天台，风把云吹成了一条发光的河。' },
          { id: uid(), kind: 'dialogue', characterId: c1, spriteId: s1a, position: 'left', text: '你就是新转来的同学？这里一般是天文社的地盘。' },
          { id: uid(), kind: 'dialogue', characterId: c2, spriteId: s2a, position: 'right', text: '……我只是想找个能听见自己心跳的地方。' },
          { id: uid(), kind: 'bg', backgroundId: bg3 },
          { id: uid(), kind: 'dialogue', characterId: c1, spriteId: s1b, position: 'left', text: '那正好，今晚有流星雨。要不要留下来看？' },
          {
            id: uid(),
            kind: 'choice',
            prompt: '江燃该怎么回答？',
            options: [
              { id: uid(), text: '「好啊，反正我也无处可去。」', targetSceneId: sc2 },
              { id: uid(), text: '「不了，我还有事。」', targetSceneId: sc3 },
            ],
          },
        ],
      },
      {
        id: sc2,
        title: '第二幕 · 流星雨',
        backgroundId: bg3,
        bgmId: null,
        beats: [
          { id: uid(), kind: 'dialogue', characterId: null, spriteId: null, position: 'center', text: '夜幕降下，第一颗流星划过的时候，他摘下了耳机。' },
          {
            id: uid(), kind: 'enter',
            entries: [
              { id: uid(), characterId: c1, spriteId: s1a, position: 'far-left' },
              { id: uid(), characterId: c2, spriteId: s2a, position: 'far-right' },
            ],
          },
          { id: uid(), kind: 'effect', effect: 'shake', from: 'far-left', to: 'far-right' },
          { id: uid(), kind: 'dialogue', characterId: null, spriteId: null, position: 'center', text: '一颗流星坠向地平线，夜空仿佛震颤了一瞬。' },
          {
            id: uid(), kind: 'move',
            moves: [
              { id: uid(), from: 'far-left', to: 'left' },
              { id: uid(), from: 'far-right', to: 'right' },
            ],
          },
          { id: uid(), kind: 'dialogue', characterId: c2, spriteId: s2b, position: 'right', text: '原来星星坠落的声音，比耳机里的歌好听。' },
          { id: uid(), kind: 'dialogue', characterId: c1, spriteId: s1b, position: 'left', text: '欢迎加入天文社，江燃同学。' },
          { id: uid(), kind: 'effect', effect: 'clash', from: 'left', to: 'right' },
          { id: uid(), kind: 'dialogue', characterId: null, spriteId: null, position: 'center', text: '（她伸出手，和他在星空下击了个掌。）' },
          { id: uid(), kind: 'dialogue', characterId: null, spriteId: null, position: 'center', text: '忽然，一颗火流星砸向远处的山谷——' },
          { id: uid(), kind: 'effect', effect: 'shake-hard' },
          { id: uid(), kind: 'effect', effect: 'clear', targets: ['left', 'right'] },
          { id: uid(), kind: 'dialogue', characterId: null, spriteId: null, position: 'center', text: '两人并肩走下天台，把漫天流星留在了身后。' },
        ],
      },
      {
        id: sc3,
        title: '第二幕 · 空教室',
        backgroundId: bg2,
        bgmId: null,
        beats: [
          { id: uid(), kind: 'dialogue', characterId: c2, spriteId: s2a, position: 'center', text: '（他转身离开，背影消失在楼梯口。）' },
          { id: uid(), kind: 'effect', effect: 'clear', target: 'center' },
          { id: uid(), kind: 'dialogue', characterId: c1, spriteId: s1a, position: 'left', text: '……明天，他还会来吗？' },
          { id: uid(), kind: 'dialogue', characterId: c2, spriteId: null, position: 'right', text: '（手机震动，一条新消息）——明天见，社长。', showSprite: false },
          { id: uid(), kind: 'dialogue', characterId: null, spriteId: null, position: 'center', text: '故事还没有结束——去编辑器里续写吧。' },
        ],
      },
    ],
  }
}

export function loadProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProject()
    const parsed = JSON.parse(raw) as Project
    if (!parsed.characters || !parsed.scenes || !parsed.backgrounds) return defaultProject()
    // 兼容旧版本存档
    if (!Array.isArray(parsed.bgms)) parsed.bgms = []
    return parsed
  } catch {
    return defaultProject()
  }
}

export function saveProject(p: Project) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // 存储超限等情况：静默失败，界面仍可用
  }
}

export function exportProject(p: Project) {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${p.title || 'visual-novel'}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** 从导出的播放器 HTML 中抽取内嵌的项目 JSON；普通 JSON 文件原样返回 */
function extractProjectText(text: string): string {
  const m = text.match(/<script[^>]*id=["']vn-data["'][^>]*>([\s\S]*?)<\/script>/i)
  return m ? m[1].trim() : text
}

export function importProject(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取失败'))
    reader.onload = () => {
      try {
        const parsed = JSON.parse(extractProjectText(reader.result as string)) as Project
        if (!parsed.characters || !parsed.scenes) throw new Error('文件格式不正确')
        if (!Array.isArray(parsed.bgms)) parsed.bgms = []
        if (!Array.isArray(parsed.backgrounds)) parsed.backgrounds = []
        resolve(parsed)
      } catch (e) {
        reject(e)
      }
    }
    reader.readAsText(file)
  })
}
