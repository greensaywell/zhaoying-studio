import { useRef, useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import type { Background, Project } from '@/types'
import { fileToDataURL, uid } from '@/lib/store'

interface Props {
  project: Project
  update: (fn: (p: Project) => Project) => void
}

const GRADIENT_PRESETS: { name: string; value: string }[] = [
  { name: '黄昏天台', value: 'linear-gradient(180deg, #2b1a4a 0%, #7a3a6e 45%, #e8663c 80%, #f7a84c 100%)' },
  { name: '深夜教室', value: 'linear-gradient(180deg, #0b0e1d 0%, #1b2547 60%, #33415e 100%)' },
  { name: '星空', value: 'radial-gradient(ellipse at 50% 120%, #442369 0%, #14101f 55%, #05030a 100%)' },
  { name: '清晨街道', value: 'linear-gradient(180deg, #a8c8e8 0%, #e8d8c8 70%, #f7e8d8 100%)' },
  { name: '雨夜巷口', value: 'linear-gradient(180deg, #101418 0%, #1e2c34 55%, #2c4048 100%)' },
  { name: '樱花坡道', value: 'linear-gradient(180deg, #f6d5e0 0%, #eeb8cc 50%, #b78bb8 100%)' },
]

export function backgroundStyle(bg: Background | null | undefined): React.CSSProperties {
  if (!bg) return { background: 'linear-gradient(180deg,#1b1b1b,#0d0d0d)' }
  if (bg.kind === 'image' && bg.image) {
    return { backgroundImage: `url(${bg.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  return { background: bg.gradient ?? '#1b1b1b' }
}

export default function BackgroundsView({ project, update }: Props) {
  const [fromColor, setFromColor] = useState('#442369')
  const [toColor, setToColor] = useState('#14101f')
  const fileRef = useRef<HTMLInputElement>(null)

  const addBackground = (bg: Background) =>
    update(p => ({ ...p, backgrounds: [...p.backgrounds, bg] }))

  const removeBackground = (id: string) =>
    update(p => ({
      ...p,
      backgrounds: p.backgrounds.filter(b => b.id !== id),
      scenes: p.scenes.map(s => (s.backgroundId === id ? { ...s, backgroundId: null } : s)),
    }))

  const renameBackground = (id: string, name: string) =>
    update(p => ({ ...p, backgrounds: p.backgrounds.map(b => (b.id === id ? { ...b, name } : b)) }))

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const dataURL = await fileToDataURL(file, 1920)
    addBackground({ id: uid(), name: file.name.replace(/\.\w+$/, ''), kind: 'image', image: dataURL })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-6">
        <div className="flex items-center justify-between">
          <span className="mono-label">场景背景</span>
          <button onClick={() => fileRef.current?.click()} className="pill-btn pill-btn-outline !px-3 !py-1.5 text-xs">
            <Upload size={14} /> 上传背景图
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </div>

        {/* 我的背景 */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {project.backgrounds.map(bg => (
            <div key={bg.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1c]">
              <div className="relative h-32" style={backgroundStyle(bg)}>
                <button
                  onClick={() => removeBackground(bg.id)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white/70 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
                  title="删除背景"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <input
                className="w-full bg-transparent px-3 py-2 text-sm outline-none focus:bg-white/5"
                value={bg.name}
                onChange={e => renameBackground(bg.id, e.target.value)}
              />
            </div>
          ))}
          {project.backgrounds.length === 0 && (
            <p className="col-span-full py-6 text-center text-xs text-white/35">
              还没有背景，从下方预设添加，或上传一张背景图
            </p>
          )}
        </div>

        {/* 渐变预设 */}
        <div className="mt-8">
          <span className="mono-label">渐变预设 · 点击添加</span>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {GRADIENT_PRESETS.map(g => (
              <button
                key={g.name}
                onClick={() => addBackground({ id: uid(), name: g.name, kind: 'gradient', gradient: g.value })}
                className="group overflow-hidden rounded-2xl border border-white/10 text-left transition-transform hover:scale-[1.02]"
              >
                <div className="flex h-24 items-end p-3" style={{ background: g.value }}>
                  <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
                    <Plus size={11} className="mr-1 inline" />
                    {g.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 自定义双色渐变 */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#1c1c1c] p-5">
          <span className="mono-label">自定义渐变</span>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/70">
              上
              <input type="color" value={fromColor} onChange={e => setFromColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded-lg border border-white/20 bg-transparent" />
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              下
              <input type="color" value={toColor} onChange={e => setToColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded-lg border border-white/20 bg-transparent" />
            </label>
            <div className="h-10 flex-1 min-w-32 rounded-full border border-white/10" style={{ background: `linear-gradient(180deg, ${fromColor}, ${toColor})` }} />
            <button
              onClick={() =>
                addBackground({
                  id: uid(),
                  name: '自定义渐变',
                  kind: 'gradient',
                  gradient: `linear-gradient(180deg, ${fromColor}, ${toColor})`,
                })
              }
              className="pill-btn pill-btn-fill !px-4 !py-2 text-xs"
            >
              <Plus size={13} /> 添加
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
