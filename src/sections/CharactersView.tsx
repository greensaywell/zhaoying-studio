import { useRef, useState } from 'react'
import { Plus, Trash2, Upload, UserRound } from 'lucide-react'
import type { Character, Project } from '@/types'
import { fileToDataURL, uid } from '@/lib/store'
import SpriteFigure from '@/components/SpriteFigure'

interface Props {
  project: Project
  update: (fn: (p: Project) => Project) => void
}

const COLOR_SWATCHES = ['#D1D0EA', '#FF6B35', '#F7E84C', '#00C853', '#2979FF', '#FFA7F0', '#F0F0F0', '#8B5CF6']

export default function CharactersView({ project, update }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(project.characters[0]?.id ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<{ charId: string; spriteId: string } | null>(null)

  const selected = project.characters.find(c => c.id === selectedId) ?? project.characters[0] ?? null

  const patchCharacter = (id: string, patch: Partial<Character>) =>
    update(p => ({ ...p, characters: p.characters.map(c => (c.id === id ? { ...c, ...patch } : c)) }))

  const addCharacter = () => {
    const id = uid()
    update(p => ({
      ...p,
      characters: [
        ...p.characters,
        {
          id,
          name: `新角色 ${p.characters.length + 1}`,
          title: '',
          color: COLOR_SWATCHES[p.characters.length % COLOR_SWATCHES.length],
          sprites: [{ id: uid(), name: '默认', image: null }],
        },
      ],
    }))
    setSelectedId(id)
  }

  const removeCharacter = (id: string) => {
    update(p => ({
      ...p,
      characters: p.characters.filter(c => c.id !== id),
      // 清理剧情中对该角色的引用
      scenes: p.scenes.map(s => ({
        ...s,
        beats: s.beats.map(b =>
          b.kind === 'dialogue' && b.characterId === id ? { ...b, characterId: null, spriteId: null } : b,
        ),
      })),
    }))
    if (selectedId === id) setSelectedId(null)
  }

  const addSprite = (charId: string) =>
    update(p => ({
      ...p,
      characters: p.characters.map(c =>
        c.id === charId
          ? { ...c, sprites: [...c.sprites, { id: uid(), name: `差分 ${c.sprites.length + 1}`, image: null }] }
          : c,
      ),
    }))

  const patchSprite = (charId: string, spriteId: string, patch: Partial<{ name: string; image: string | null }>) =>
    update(p => ({
      ...p,
      characters: p.characters.map(c =>
        c.id === charId
          ? { ...c, sprites: c.sprites.map(s => (s.id === spriteId ? { ...s, ...patch } : s)) }
          : c,
      ),
    }))

  const removeSprite = (charId: string, spriteId: string) =>
    update(p => ({
      ...p,
      characters: p.characters.map(c =>
        c.id === charId ? { ...c, sprites: c.sprites.filter(s => s.id !== spriteId) } : c,
      ),
      scenes: p.scenes.map(s => ({
        ...s,
        beats: s.beats.map(b => (b.kind === 'dialogue' && b.spriteId === spriteId ? { ...b, spriteId: null } : b)),
      })),
    }))

  const triggerUpload = (charId: string, spriteId: string) => {
    uploadTargetRef.current = { charId, spriteId }
    fileInputRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const target = uploadTargetRef.current
    if (!file || !target) return
    const dataURL = await fileToDataURL(file)
    patchSprite(target.charId, target.spriteId, { image: dataURL })
  }

  return (
    <div className="flex h-full">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {/* 左栏：角色列表 */}
      <aside className="w-60 flex-none border-r border-white/10 flex flex-col bg-[#181818]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <span className="mono-label">角色</span>
          <button onClick={addCharacter} className="pill-btn pill-btn-outline !px-3 !py-1.5 text-xs">
            <Plus size={14} /> 新建
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {project.characters.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                selected?.id === c.id ? 'bg-[#442369]/60 ring-1 ring-[#D1D0EA]/40' : 'hover:bg-white/5'
              }`}
            >
              <span
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold text-[#1b1b1b]"
                style={{ background: c.color }}
              >
                {c.name.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block truncate text-xs text-white/40">{c.sprites.length} 个立绘差分</span>
              </span>
            </button>
          ))}
          {project.characters.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-white/35">
              还没有角色
              <br />
              点击「新建」创建第一位登场人物
            </p>
          )}
        </div>
      </aside>

      {/* 右栏：角色编辑 */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="mx-auto max-w-3xl px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-4">
                <div>
                  <span className="mono-label">姓名</span>
                  <input
                    className="field-input mt-2 text-lg font-semibold"
                    value={selected.name}
                    onChange={e => patchCharacter(selected.id, { name: e.target.value })}
                  />
                </div>
                <div>
                  <span className="mono-label">一句话介绍</span>
                  <input
                    className="field-input mt-2"
                    placeholder="例如：天文社社长 · 冷静的外表下藏着温柔"
                    value={selected.title}
                    onChange={e => patchCharacter(selected.id, { title: e.target.value })}
                  />
                </div>
                <div>
                  <span className="mono-label">主题色</span>
                  <div className="mt-2 flex items-center gap-2">
                    {COLOR_SWATCHES.map(color => (
                      <button
                        key={color}
                        onClick={() => patchCharacter(selected.id, { color })}
                        className={`h-7 w-7 rounded-full transition-transform ${
                          selected.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141414] scale-110' : 'hover:scale-110'
                        }`}
                        style={{ background: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={selected.color}
                      onChange={e => patchCharacter(selected.id, { color: e.target.value })}
                      className="h-7 w-10 cursor-pointer rounded-full border border-white/20 bg-transparent"
                      title="自定义颜色"
                    />
                  </div>
                </div>
              </div>
              <button onClick={() => removeCharacter(selected.id)} className="pill-btn pill-btn-outline !border-red-400/30 !text-red-300 text-xs">
                <Trash2 size={14} /> 删除角色
              </button>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <span className="mono-label">立绘差分</span>
              <button onClick={() => addSprite(selected.id)} className="pill-btn pill-btn-outline !px-3 !py-1.5 text-xs">
                <Plus size={14} /> 添加差分
              </button>
            </div>
            <p className="mt-2 text-xs text-white/40">
              一个角色可以有多个表情 / 姿势差分（如「默认」「微笑」「生气」），在剧情中按句切换。建议上传透明背景 PNG。
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {selected.sprites.map(sprite => (
                <div key={sprite.id} className="group rounded-2xl border border-white/10 bg-[#1c1c1c] p-3">
                  <div
                    className="relative flex h-56 items-end justify-center overflow-hidden rounded-xl"
                    style={{
                      background:
                        'repeating-conic-gradient(#222 0% 25%, #2b2b2b 0% 50%) 0 0 / 22px 22px',
                    }}
                  >
                    <SpriteFigure character={selected} sprite={sprite} height="92%" />
                    <button
                      onClick={() => triggerUpload(selected.id, sprite.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <span className="pill-btn pill-btn-fill !px-4 !py-2 text-xs">
                        <Upload size={13} /> {sprite.image ? '替换图片' : '上传立绘'}
                      </span>
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      className="field-input !py-1.5 text-xs"
                      value={sprite.name}
                      onChange={e => patchSprite(selected.id, sprite.id, { name: e.target.value })}
                    />
                    <button
                      onClick={() => removeSprite(selected.id, sprite.id)}
                      className="flex-none rounded-lg p-1.5 text-white/35 transition-colors hover:bg-red-500/15 hover:text-red-300"
                      title="删除差分"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/35">
            <UserRound size={40} strokeWidth={1.2} />
            <p className="text-sm">创建或选择一个角色开始编辑</p>
          </div>
        )}
      </div>
    </div>
  )
}
