import { useMemo, useState } from 'react'
import { Activity, ArrowDown, ArrowUp, Footprints, GitBranch, ImageIcon, MessageSquareText, Music, Play, Plus, Swords, Trash2, UserPlus, UserX, Zap } from 'lucide-react'
import type { Beat, Project, Scene, SpritePosition } from '@/types'
import { POSITIONS } from '@/types'
import { uid } from '@/lib/store'
import Stage, { type StageSprite } from '@/components/Stage'

interface Props {
  project: Project
  update: (fn: (p: Project) => Project) => void
  onPlay: (sceneId: string) => void
}

export default function StoryEditor({ project, update, onPlay }: Props) {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(project.scenes[0]?.id ?? null)
  const [previewBeatId, setPreviewBeatId] = useState<string | null>(null)

  const scene = project.scenes.find(s => s.id === selectedSceneId) ?? project.scenes[0] ?? null

  const patchScene = (id: string, patch: Partial<Scene>) =>
    update(p => ({ ...p, scenes: p.scenes.map(s => (s.id === id ? { ...s, ...patch } : s)) }))

  const patchBeat = (sceneId: string, beatId: string, patch: Record<string, unknown>) =>
    update(p => ({
      ...p,
      scenes: p.scenes.map(s =>
        s.id === sceneId
          ? { ...s, beats: s.beats.map(b => (b.id === beatId ? ({ ...b, ...patch } as Beat) : b)) }
          : s,
      ),
    }))

  const addScene = () => {
    const id = uid()
    update(p => ({
      ...p,
      scenes: [
        ...p.scenes,
        { id, title: `第 ${p.scenes.length + 1} 幕`, backgroundId: p.backgrounds[0]?.id ?? null, bgmId: null, beats: [] },
      ],
    }))
    setSelectedSceneId(id)
  }

  const removeScene = (id: string) => {
    update(p => ({
      ...p,
      scenes: p.scenes.filter(s => s.id !== id).map(s => ({
        ...s,
        beats: s.beats.map(b =>
          b.kind === 'choice'
            ? { ...b, options: b.options.map(o => (o.targetSceneId === id ? { ...o, targetSceneId: null } : o)) }
            : b,
        ),
      })),
    }))
    if (selectedSceneId === id) setSelectedSceneId(null)
  }

  const addBeat = (kind: 'dialogue' | 'choice' | 'shake' | 'shake-hard' | 'clash' | 'clear' | 'bgm' | 'bg' | 'enter' | 'move') => {
    if (!scene) return
    let beat: Beat
    if (kind === 'dialogue') {
      beat = { id: uid(), kind, characterId: null, spriteId: null, position: 'center', text: '' }
    } else if (kind === 'choice') {
      beat = { id: uid(), kind, prompt: '', options: [{ id: uid(), text: '选项一', targetSceneId: null }] }
    } else if (kind === 'clear') {
      beat = { id: uid(), kind: 'effect', effect: 'clear', target: 'all' }
    } else if (kind === 'bgm') {
      beat = { id: uid(), kind: 'bgm', bgmId: project.bgms[0]?.id ?? null }
    } else if (kind === 'bg') {
      beat = { id: uid(), kind: 'bg', backgroundId: project.backgrounds[0]?.id ?? null }
    } else if (kind === 'enter') {
      beat = {
        id: uid(),
        kind: 'enter',
        entries: [{ id: uid(), characterId: project.characters[0]?.id ?? null, spriteId: null, position: 'left' }],
      }
    } else if (kind === 'move') {
      beat = {
        id: uid(),
        kind: 'move',
        moves: [{ id: uid(), from: 'left', to: 'center' }],
      }
    } else if (kind === 'shake-hard') {
      beat = { id: uid(), kind: 'effect', effect: 'shake-hard' }
    } else {
      beat = { id: uid(), kind: 'effect', effect: kind, from: 'left', to: 'right' }
    }
    const beats = [...scene.beats]
    const selIdx = previewBeatId ? beats.findIndex(b => b.id === previewBeatId) : -1
    if (selIdx >= 0) beats.splice(selIdx + 1, 0, beat)
    else beats.push(beat)
    patchScene(scene.id, { beats })
    setPreviewBeatId(beat.id)
    setTimeout(() => document.getElementById(`beat-${beat.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50)
  }

  const removeBeat = (beatId: string) => {
    if (!scene) return
    patchScene(scene.id, { beats: scene.beats.filter(b => b.id !== beatId) })
    if (previewBeatId === beatId) setPreviewBeatId(null)
  }

  const moveBeat = (beatId: string, dir: -1 | 1) => {
    if (!scene) return
    const idx = scene.beats.findIndex(b => b.id === beatId)
    const to = idx + dir
    if (idx < 0 || to < 0 || to >= scene.beats.length) return
    const beats = [...scene.beats]
    ;[beats[idx], beats[to]] = [beats[to], beats[idx]]
    patchScene(scene.id, { beats })
  }

  // ===== 预览舞台状态：扫描到当前选中卡 =====
  const preview = useMemo(() => {
    if (!scene) return null
    const upto = previewBeatId ? scene.beats.findIndex(b => b.id === previewBeatId) : scene.beats.length - 1
    let bgId = scene.backgroundId
    for (let i = 0; i <= upto && i < scene.beats.length; i++) {
      const b = scene.beats[i]
      if (b.kind === 'bg') bgId = b.backgroundId
    }
    const bg = project.backgrounds.find(b => b.id === bgId) ?? null
    const map = new Map<SpritePosition, StageSprite>()
    for (let i = 0; i <= upto && i < scene.beats.length; i++) {
      const b = scene.beats[i]
      if (b.kind === 'effect' && b.effect === 'clear') {
        if (b.target === 'all') map.clear()
        else if (b.targets?.length) b.targets.forEach(t => map.delete(t))
        else if (b.target) map.delete(b.target)
        continue
      }
      if (b.kind === 'enter') {
        for (const e of b.entries) {
          if (!e.characterId) continue
          const character = project.characters.find(c => c.id === e.characterId)
          if (!character) continue
          const sprite = character.sprites.find(s => s.id === e.spriteId) ?? character.sprites[0] ?? null
          map.set(e.position, { position: e.position, character, sprite, dimmed: i !== upto })
        }
        continue
      }
      if (b.kind === 'move') {
        const moved: { to: SpritePosition; sp: StageSprite }[] = []
        for (const mv of b.moves) {
          const sp = map.get(mv.from)
          if (sp) moved.push({ to: mv.to, sp })
        }
        for (const mv of b.moves) map.delete(mv.from)
        for (const m of moved) map.set(m.to, { ...m.sp, position: m.to, dimmed: i !== upto })
        continue
      }
      if (b.kind !== 'dialogue' || !b.characterId || b.showSprite === false) continue
      const character = project.characters.find(c => c.id === b.characterId)
      if (!character) continue
      const sprite = character.sprites.find(s => s.id === b.spriteId) ?? character.sprites[0] ?? null
      map.set(b.position, { position: b.position, character, sprite, dimmed: i !== upto })
    }
    return { bg, sprites: [...map.values()] }
  }, [scene, previewBeatId, project.backgrounds, project.characters])

  return (
    <div className="flex h-full">
      {/* 左栏：场景列表 */}
      <aside className="w-60 flex-none border-r border-white/10 flex flex-col bg-[#181818]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <span className="mono-label">分幕</span>
          <button onClick={addScene} className="pill-btn pill-btn-outline !px-3 !py-1.5 text-xs">
            <Plus size={14} /> 新幕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {project.scenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setSelectedSceneId(s.id); setPreviewBeatId(null) }}
              className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                scene?.id === s.id ? 'bg-[#442369]/60 ring-1 ring-[#D1D0EA]/40' : 'hover:bg-white/5'
              }`}
            >
              <span className="block text-[10px] font-mono tracking-widest text-white/35">
                SCENE {String(i + 1).padStart(2, '0')}
              </span>
              <span className="block truncate text-sm font-medium">{s.title}</span>
              <span className="block text-xs text-white/40">{s.beats.length} 个剧情卡</span>
            </button>
          ))}
        </div>
      </aside>

      {scene ? (
        <>
          {/* 中栏：剧情卡时间线 */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-2xl">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-48">
                  <span className="mono-label">幕标题</span>
                  <input
                    className="field-input mt-2 text-lg font-semibold"
                    value={scene.title}
                    onChange={e => patchScene(scene.id, { title: e.target.value })}
                  />
                </div>
                <div className="w-40">
                  <span className="mono-label">起始背景</span>
                  <select
                    className="field-input mt-2"
                    value={scene.backgroundId ?? ''}
                    onChange={e => patchScene(scene.id, { backgroundId: e.target.value || null })}
                  >
                    <option value="">（无背景）</option>
                    {project.backgrounds.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-40">
                  <span className="mono-label">起始 BGM</span>
                
                  <select
                    className="field-input mt-2"
                    value={scene.bgmId ?? ''}
                    onChange={e => patchScene(scene.id, { bgmId: e.target.value || null })}
                  >
                    <option value="">（无音乐）</option>
                    {project.bgms.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => onPlay(scene.id)} className="pill-btn pill-btn-fill !py-2.5">
                  <Play size={15} /> 播放此幕
                </button>
                <button
                  onClick={() => removeScene(scene.id)}
                  className="pill-btn pill-btn-outline !border-red-400/30 !text-red-300 !py-2.5 text-xs"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* 剧情卡列表 */}
              <div className="mt-6 space-y-3">
                {scene.beats.map((beat, idx) => (
                  <div
                    key={beat.id}
                    id={`beat-${beat.id}`}
                    onClick={() => setPreviewBeatId(previewBeatId === beat.id ? null : beat.id)}
                    className={`rounded-2xl border bg-[#1c1c1c] p-4 transition-colors cursor-pointer ${
                      previewBeatId === beat.id ? 'border-[#D1D0EA]/60' : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] tracking-widest text-white/30">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {beat.kind === 'dialogue' ? (
                        <MessageSquareText size={13} className="text-[#D1D0EA]" />
                      ) : beat.kind === 'choice' ? (
                        <GitBranch size={13} className="text-[#FF6B35]" />
                      ) : beat.kind === 'bgm' ? (
                        <Music size={13} className="text-[#00C853]" />
                      ) : beat.kind === 'bg' ? (
                        <ImageIcon size={13} className="text-[#2979FF]" />
                      ) : beat.kind === 'enter' ? (
                        <UserPlus size={13} className="text-[#FFA7F0]" />
                      ) : beat.kind === 'move' ? (
                        <Footprints size={13} className="text-[#1DE9B6]" />
                      ) : beat.effect === 'shake' ? (
                        <Zap size={13} className="text-[#F7E84C]" />
                      ) : beat.effect === 'shake-hard' ? (
                        <Activity size={13} className="text-[#FF2D55]" />
                      ) : beat.effect === 'clash' ? (
                        <Swords size={13} className="text-[#FF6B35]" />
                      ) : (
                        <UserX size={13} className="text-[#D1D0EA]" />
                      )}
                      <span className="text-xs text-white/40">
                        {beat.kind === 'dialogue'
                          ? '对白'
                          : beat.kind === 'choice'
                            ? '分支选项'
                            : beat.kind === 'bgm'
                              ? '音乐切换'
                              : beat.kind === 'bg'
                                ? '背景切换'
                                : beat.kind === 'enter'
                                  ? '角色上场'
                                  : beat.kind === 'move'
                                    ? '角色走位'
                                    : beat.effect === 'shake'
                                      ? '演出 · 爆炸抖动'
                                      : beat.effect === 'shake-hard'
                                        ? '演出 · 剧烈抖动'
                                        : beat.effect === 'clash'
                                          ? '演出 · 战斗碰撞'
                                          : '演出 · 角色下场'}
                      </span>
                      <span className="flex-1" />
                      <button onClick={e => { e.stopPropagation(); moveBeat(beat.id, -1) }} className="rounded-md p-1 text-white/35 hover:bg-white/10 hover:text-white" title="上移">
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); moveBeat(beat.id, 1) }} className="rounded-md p-1 text-white/35 hover:bg-white/10 hover:text-white" title="下移">
                        <ArrowDown size={14} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeBeat(beat.id) }} className="rounded-md p-1 text-white/35 hover:bg-red-500/15 hover:text-red-300" title="删除">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {beat.kind === 'dialogue' ? (
                      <div className="mt-3 space-y-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className="field-input !w-36 !py-1.5 text-xs"
                            value={beat.characterId ?? ''}
                            onChange={e => patchBeat(scene.id, beat.id, { characterId: e.target.value || null, spriteId: null })}
                          >
                            <option value="">旁白</option>
                            {project.characters.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          {beat.characterId && (
                            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/55 select-none" title="关闭后该句只显示名字，舞台上不出现角色形象（适合电话、内心独白、神秘人）">
                              <input
                                type="checkbox"
                                className="accent-[#D1D0EA]"
                                checked={beat.showSprite !== false}
                                onChange={e => patchBeat(scene.id, beat.id, { showSprite: e.target.checked })}
                              />
                              显示形象
                            </label>
                          )}
                          {beat.characterId && beat.showSprite !== false && (
                            <select
                              className="field-input !w-28 !py-1.5 text-xs"
                              value={beat.spriteId ?? ''}
                              onChange={e => patchBeat(scene.id, beat.id, { spriteId: e.target.value || null })}
                            >
                              <option value="">（默认差分）</option>
                              {project.characters
                                .find(c => c.id === beat.characterId)
                                ?.sprites.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                          )}
                          {beat.characterId && beat.showSprite !== false && (
                            <div className="flex overflow-hidden rounded-full border border-white/15">
                              {POSITIONS.map(pos => (
                                <button
                                  key={pos.key}
                                  onClick={() => patchBeat(scene.id, beat.id, { position: pos.key })}
                                  className={`px-2.5 py-1.5 text-xs transition-colors ${
                                    beat.position === pos.key ? 'bg-[#D1D0EA] text-[#1b1b1b] font-semibold' : 'text-white/50 hover:bg-white/10'
                                  }`}
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <textarea
                          className="field-input min-h-16 resize-y leading-relaxed"
                          placeholder={beat.characterId ? '输入台词…' : '输入旁白…'}
                          value={beat.text}
                          onChange={e => patchBeat(scene.id, beat.id, { text: e.target.value })}
                        />
                      </div>
                    ) : beat.kind === 'enter' ? (
                      <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                        <p className="text-xs leading-relaxed text-white/40">
                          一次性让多位角色同时登场（淡入动画），播放时自动推进。
                        </p>
                        {beat.entries.map(entry => {
                          const entryChar = project.characters.find(c => c.id === entry.characterId)
                          return (
                            <div key={entry.id} className="flex flex-wrap items-center gap-2">
                              <select
                                className="field-input !w-32 !py-1.5 text-xs"
                                value={entry.characterId ?? ''}
                                onChange={e =>
                                  patchBeat(scene.id, beat.id, {
                                    entries: beat.entries.map(en =>
                                      en.id === entry.id ? { ...en, characterId: e.target.value || null, spriteId: null } : en,
                                    ),
                                  })
                                }
                              >
                                <option value="">（选择角色）</option>
                                {project.characters.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              {entryChar && (
                                <select
                                  className="field-input !w-26 !py-1.5 text-xs"
                                  value={entry.spriteId ?? ''}
                                  onChange={e =>
                                    patchBeat(scene.id, beat.id, {
                                      entries: beat.entries.map(en =>
                                        en.id === entry.id ? { ...en, spriteId: e.target.value || null } : en,
                                      ),
                                    })
                                  }
                                >
                                  <option value="">（默认差分）</option>
                                  {entryChar.sprites.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              )}
                              <div className="flex overflow-hidden rounded-full border border-white/15">
                                {POSITIONS.map(pos => (
                                  <button
                                    key={pos.key}
                                    onClick={() =>
                                      patchBeat(scene.id, beat.id, {
                                        entries: beat.entries.map(en =>
                                          en.id === entry.id ? { ...en, position: pos.key } : en,
                                        ),
                                      })
                                    }
                                    className={`px-2.5 py-1.5 text-xs transition-colors ${
                                      entry.position === pos.key ? 'bg-[#D1D0EA] text-[#1b1b1b] font-semibold' : 'text-white/50 hover:bg-white/10'
                                    }`}
                                  >
                                    {pos.label}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() =>
                                  patchBeat(scene.id, beat.id, { entries: beat.entries.filter(en => en.id !== entry.id) })
                                }
                                className="rounded-md p-1 text-white/35 hover:bg-red-500/15 hover:text-red-300"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )
                        })}
                        <button
                          onClick={() =>
                            patchBeat(scene.id, beat.id, {
                              entries: [
                                ...beat.entries,
                                { id: uid(), characterId: project.characters[0]?.id ?? null, spriteId: null, position: 'right' },
                              ],
                            })
                          }
                          className="text-xs text-[#D1D0EA] hover:underline"
                        >
                          + 添加角色
                        </button>
                      </div>
                    ) : beat.kind === 'move' ? (
                      <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                        <p className="text-xs leading-relaxed text-white/40">
                          让已在台上的角色直接滑动到新站位（无需先下场再上场），多人同时走位、可交换位置，播放时自动推进。
                        </p>
                        {beat.moves.map(mv => (
                          <div key={mv.id} className="flex flex-wrap items-center gap-2">
                            <select
                              className="field-input !w-28 !py-1.5 text-xs"
                              value={mv.from}
                              onChange={e =>
                                patchBeat(scene.id, beat.id, {
                                  moves: beat.moves.map(m => (m.id === mv.id ? { ...m, from: e.target.value as SpritePosition } : m)),
                                })
                              }
                            >
                              {POSITIONS.map(p => (
                                <option key={p.key} value={p.key}>{p.label}侧</option>
                              ))}
                            </select>
                            <Footprints size={13} className="text-[#1DE9B6]" />
                            <select
                              className="field-input !w-28 !py-1.5 text-xs"
                              value={mv.to}
                              onChange={e =>
                                patchBeat(scene.id, beat.id, {
                                  moves: beat.moves.map(m => (m.id === mv.id ? { ...m, to: e.target.value as SpritePosition } : m)),
                                })
                              }
                            >
                              {POSITIONS.map(p => (
                                <option key={p.key} value={p.key}>{p.label}侧</option>
                              ))}
                            </select>
                            {mv.from === mv.to && <span className="text-xs text-red-300">起止站位相同</span>}
                            <button
                              onClick={() => patchBeat(scene.id, beat.id, { moves: beat.moves.filter(m => m.id !== mv.id) })}
                              className="rounded-md p-1 text-white/35 hover:bg-red-500/15 hover:text-red-300"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        {new Set(beat.moves.map(m => m.from)).size < beat.moves.length && (
                          <p className="text-xs text-red-300">有多个走位使用了相同的起始站位</p>
                        )}
                        <button
                          onClick={() =>
                            patchBeat(scene.id, beat.id, {
                              moves: [...beat.moves, { id: uid(), from: 'center', to: 'right' }],
                            })
                          }
                          className="text-xs text-[#D1D0EA] hover:underline"
                        >
                          + 添加走位
                        </button>
                      </div>
                    ) : beat.kind === 'bg' ? (
                      <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                        <p className="text-xs leading-relaxed text-white/40">
                          播放到这里时更换舞台背景（带淡入过渡，幕设置里的背景是起始背景），播放时自动推进。
                        </p>
                        <select
                          className="field-input !w-52 !py-1.5 text-xs"
                          value={beat.backgroundId ?? ''}
                          onChange={e => patchBeat(scene.id, beat.id, { backgroundId: e.target.value || null })}
                        >
                          <option value="">（无背景）</option>
                          {project.backgrounds.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : beat.kind === 'bgm' ? (
                      <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                        <p className="text-xs leading-relaxed text-white/40">
                          播放到这里时切换背景音乐（幕设置里的 BGM 是起始音乐），播放时自动推进。
                        </p>
                        <select
                          className="field-input !w-52 !py-1.5 text-xs"
                          value={beat.bgmId ?? ''}
                          onChange={e => patchBeat(scene.id, beat.id, { bgmId: e.target.value || null })}
                        >
                          <option value="">♪ 停止音乐</option>
                          {project.bgms.map(b => (
                            <option key={b.id} value={b.id}>♪ {b.name}</option>
                          ))}
                        </select>
                        {project.bgms.length === 0 && (
                          <p className="text-xs text-amber-300/80">音乐库还是空的，先到顶栏「音乐」页上传音频</p>
                        )}
                      </div>
                    ) : beat.kind === 'effect' ? (
                      <div className="mt-3" onClick={e => e.stopPropagation()}>
                        {beat.effect === 'shake' ? (
                          <p className="text-xs leading-relaxed text-white/40">
                            整屏剧烈晃动并伴随闪光，适合爆炸、坠落、冲击等场面，播放时自动推进。
                          </p>
                        ) : beat.effect === 'shake-hard' ? (
                          <p className="text-xs leading-relaxed text-white/40">
                            比爆炸抖动更猛烈的持续震动：幅度更大、画面带倾斜、伴随双重闪光，适合地震、崩塌、大爆炸等极端场面，播放时自动推进。
                          </p>
                        ) : beat.effect === 'clear' ? (
                          <div className="space-y-2">
                            <p className="text-xs leading-relaxed text-white/40">
                              播放到这里时，勾选站位的角色淡出离场，可一次勾选多位（否则角色上场后会一直留在台上）。
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/70 select-none">
                                <input
                                  type="checkbox"
                                  className="accent-[#D1D0EA]"
                                  checked={beat.target === 'all'}
                                  onChange={e =>
                                    patchBeat(scene.id, beat.id, e.target.checked ? { target: 'all', targets: undefined } : { target: undefined, targets: [] })
                                  }
                                />
                                全部下场
                              </label>
                              {POSITIONS.map(pos => {
                                const cur = beat.targets ?? (beat.target && beat.target !== 'all' ? [beat.target] : [])
                                const checked = beat.target === 'all' || cur.includes(pos.key)
                                return (
                                  <label key={pos.key} className="flex cursor-pointer items-center gap-1.5 text-xs text-white/70 select-none">
                                    <input
                                      type="checkbox"
                                      className="accent-[#D1D0EA]"
                                      disabled={beat.target === 'all'}
                                      checked={checked}
                                      onChange={e => {
                                        const next = e.target.checked ? [...cur, pos.key] : cur.filter(t => t !== pos.key)
                                        patchBeat(scene.id, beat.id, { targets: next, target: undefined })
                                      }}
                                    />
                                    {pos.label}侧
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs leading-relaxed text-white/40">
                              两个站位的角色互相冲刺碰撞（伴随闪光与震动），播放时自动推进。请选择参与碰撞的站位：
                            </p>
                            <div className="flex items-center gap-2">
                              <select
                                className="field-input !w-28 !py-1.5 text-xs"
                                value={beat.from}
                                onChange={e => patchBeat(scene.id, beat.id, { from: e.target.value })}
                              >
                                {POSITIONS.map(p => (
                                  <option key={p.key} value={p.key}>{p.label}侧</option>
                                ))}
                              </select>
                              <Swords size={14} className="text-[#FF6B35]" />
                              <select
                                className="field-input !w-28 !py-1.5 text-xs"
                                value={beat.to}
                                onChange={e => patchBeat(scene.id, beat.id, { to: e.target.value })}
                              >
                                {POSITIONS.map(p => (
                                  <option key={p.key} value={p.key}>{p.label}侧</option>
                                ))}
                              </select>
                              {beat.from === beat.to && (
                                <span className="text-xs text-red-300">两侧站位需不同</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                        <input
                          className="field-input !py-1.5 text-xs"
                          placeholder="选项前的引导语（可留空）"
                          value={beat.prompt}
                          onChange={e => patchBeat(scene.id, beat.id, { prompt: e.target.value })}
                        />
                        {beat.options.map((opt, oi) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-white/30">{String.fromCharCode(65 + oi)}</span>
                            <input
                              className="field-input flex-1 !py-1.5 text-xs"
                              placeholder="选项文字"
                              value={opt.text}
                              onChange={e =>
                                patchBeat(scene.id, beat.id, {
                                  options: beat.options.map(o => (o.id === opt.id ? { ...o, text: e.target.value } : o)),
                                })
                              }
                            />
                            <select
                              className="field-input !w-40 !py-1.5 text-xs"
                              value={opt.targetSceneId ?? ''}
                              onChange={e =>
                                patchBeat(scene.id, beat.id, {
                                  options: beat.options.map(o =>
                                    o.id === opt.id ? { ...o, targetSceneId: e.target.value || null } : o,
                                  ),
                                })
                              }
                            >
                              <option value="">（故事结束）</option>
                              {project.scenes.map(s => (
                                <option key={s.id} value={s.id}>→ {s.title}</option>
                              ))}
                            </select>
                            <button
                              onClick={() =>
                                patchBeat(scene.id, beat.id, { options: beat.options.filter(o => o.id !== opt.id) })
                              }
                              className="rounded-md p-1 text-white/35 hover:bg-red-500/15 hover:text-red-300"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            patchBeat(scene.id, beat.id, {
                              options: [...beat.options, { id: uid(), text: `选项 ${beat.options.length + 1}`, targetSceneId: null }],
                            })
                          }
                          className="text-xs text-[#D1D0EA] hover:underline"
                        >
                          + 添加选项
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {scene.beats.length === 0 && (
                  <p className="py-10 text-center text-xs text-white/35">这一幕还是空白，从下方添加第一张剧情卡</p>
                )}
              </div>

              <div className="sticky bottom-0 -mx-2 mt-5 flex flex-wrap justify-center gap-3 bg-gradient-to-t from-[#141414] via-[#141414]/95 to-transparent px-2 pb-5 pt-8">
                {scene.beats.length > 0 && (
                  <p className="w-full text-center text-[11px] text-white/40">
                    {previewBeatId && scene.beats.some(b => b.id === previewBeatId)
                      ? `新剧情卡将插入到第 ${String(scene.beats.findIndex(b => b.id === previewBeatId) + 1).padStart(2, '0')} 张之后 · 再次点击该卡可取消选中（追加到幕末）`
                      : '新剧情卡将追加到幕末 · 点击任意卡片可在其后面插入'}
                  </p>
                )}
                <button onClick={() => addBeat('dialogue')} className="pill-btn pill-btn-outline text-xs">
                  <MessageSquareText size={14} /> 对白
                </button>
                <button onClick={() => addBeat('choice')} className="pill-btn pill-btn-outline text-xs">
                  <GitBranch size={14} /> 分支选项
                </button>
                <button onClick={() => addBeat('shake')} className="pill-btn pill-btn-outline text-xs">
                  <Zap size={14} /> 爆炸抖动
                </button>
                <button onClick={() => addBeat('shake-hard')} className="pill-btn pill-btn-outline text-xs">
                  <Activity size={14} /> 剧烈抖动
                </button>
                <button onClick={() => addBeat('clash')} className="pill-btn pill-btn-outline text-xs">
                  <Swords size={14} /> 战斗碰撞
                </button>
                <button onClick={() => addBeat('enter')} className="pill-btn pill-btn-outline text-xs">
                  <UserPlus size={14} /> 角色上场
                </button>
                <button onClick={() => addBeat('move')} className="pill-btn pill-btn-outline text-xs">
                  <Footprints size={14} /> 角色走位
                </button>
                <button onClick={() => addBeat('clear')} className="pill-btn pill-btn-outline text-xs">
                  <UserX size={14} /> 角色下场
                </button>
                <button onClick={() => addBeat('bgm')} className="pill-btn pill-btn-outline text-xs">
                  <Music size={14} /> 音乐切换
                </button>
                <button onClick={() => addBeat('bg')} className="pill-btn pill-btn-outline text-xs">
                  <ImageIcon size={14} /> 背景切换
                </button>
              </div>
            </div>
          </div>

          {/* 右栏：实时舞台预览 */}
          <aside className="hidden w-[380px] flex-none border-l border-white/10 bg-[#181818] lg:flex lg:flex-col">
            <div className="px-4 pt-4 pb-3">
              <span className="mono-label">舞台预览</span>
            </div>
            <div className="px-4 pb-4">
              <div className="aspect-video overflow-hidden rounded-xl border border-white/10">
                {preview && <Stage background={preview.bg} sprites={preview.sprites} />}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/35">
                点击左侧剧情卡，即可预览演出到该句时的舞台状态（背景 + 立绘站位）；被选中的卡片同时也是新剧情卡的插入位置。
              </p>
            </div>
          </aside>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-white/35">
          创建一幕，开始编写剧情
        </div>
      )}
    </div>
  )
}
