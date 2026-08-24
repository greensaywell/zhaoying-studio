import { useEffect, useRef, useState } from 'react'
import { Music, Pause, Play, Trash2, Upload } from 'lucide-react'
import type { Project } from '@/types'
import { fileToDataURL, uid } from '@/lib/store'

interface Props {
  project: Project
  update: (fn: (p: Project) => Project) => void
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function BgmView({ project, update }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const togglePlay = (id: string, src: string) => {
    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.src = src
    audioRef.current.loop = true
    audioRef.current.volume = 0.6
    audioRef.current.play().catch(() => {})
    setPlayingId(id)
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    for (const file of files) {
      const dataURL = await fileToDataURL(file)
      update(p => ({
        ...p,
        bgms: [
          ...p.bgms,
          { id: uid(), name: file.name.replace(/\.\w+$/, ''), audio: dataURL, size: file.size },
        ],
      }))
    }
  }

  const removeBgm = (id: string) => {
    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId(null)
    }
    update(p => ({
      ...p,
      bgms: p.bgms.filter(b => b.id !== id),
      scenes: p.scenes.map(s => (s.bgmId === id ? { ...s, bgmId: null } : s)),
    }))
  }

  const renameBgm = (id: string, name: string) =>
    update(p => ({ ...p, bgms: p.bgms.map(b => (b.id === id ? { ...b, name } : b)) }))

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-6">
        <div className="flex items-center justify-between">
          <span className="mono-label">背景音乐</span>
          <button onClick={() => fileRef.current?.click()} className="pill-btn pill-btn-outline !px-3 !py-1.5 text-xs">
            <Upload size={14} /> 上传音频
          </button>
          <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={onUpload} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/40">
          上传后可在「剧情编辑」里为每一幕设置起始 BGM，也可以插入「音乐切换」剧情卡在幕内随时换歌。支持 MP3 / OGG / WAV 等格式。
          由于作品数据保存在浏览器中，建议单个文件不超过 4 MB。
        </p>

        <div className="mt-5 space-y-2.5">
          {project.bgms.map(bgm => (
            <div
              key={bgm.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1c1c1c] px-4 py-3"
            >
              <button
                onClick={() => togglePlay(bgm.id, bgm.audio)}
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-full transition-colors ${
                  playingId === bgm.id ? 'bg-[#D1D0EA] text-[#1b1b1b]' : 'bg-white/8 text-white/70 hover:bg-white/15'
                }`}
                title={playingId === bgm.id ? '暂停' : '试听'}
              >
                {playingId === bgm.id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <input
                  className="w-full bg-transparent text-sm font-medium outline-none focus:bg-white/5 rounded px-1 -ml-1"
                  value={bgm.name}
                  onChange={e => renameBgm(bgm.id, e.target.value)}
                />
                <span className="px-1 text-xs text-white/35">
                  {formatSize(bgm.size)}
                  {playingId === bgm.id && ' · 循环播放中'}
                </span>
              </div>
              <button
                onClick={() => removeBgm(bgm.id)}
                className="rounded-lg p-2 text-white/35 transition-colors hover:bg-red-500/15 hover:text-red-300"
                title="删除"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          {project.bgms.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 py-14 text-white/35">
              <Music size={36} strokeWidth={1.2} />
              <p className="text-sm">还没有音乐，点击右上角「上传音频」添加第一首 BGM</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
