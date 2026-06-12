import { useState } from 'react'
import { StudentTrailResult } from '@/components/trails/StudentTrailResult'
import type { StudentAssignedTrail } from '@/lib/studentForm'
import { cn } from '@/lib/utils'

const TAPS_TO_LAUNCH = 8

interface RocketTrailUnlockProps {
  trail: StudentAssignedTrail
  accent?: string
}

export function RocketTrailUnlock({ trail, accent = '#14b8a6' }: RocketTrailUnlockProps) {
  const [taps, setTaps] = useState(0)
  const [launched, setLaunched] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [shake, setShake] = useState(false)

  const progress = Math.min(100, (taps / TAPS_TO_LAUNCH) * 100)

  const handleRocketTap = () => {
    if (launched || revealed) return

    setShake(true)
    window.setTimeout(() => setShake(false), 200)

    const next = taps + 1
    setTaps(next)

    if (next >= TAPS_TO_LAUNCH) {
      setLaunched(true)
      window.setTimeout(() => {
        setRevealed(true)
      }, 1400)
    }
  }

  if (revealed) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="text-center mb-4">
          <p className="text-2xl mb-1">🎉</p>
          <p className="text-sm font-medium" style={{ color: accent }}>
            Foguete decolou! Sua trilha chegou!
          </p>
        </div>
        <StudentTrailResult trail={trail} accent={accent} />
      </div>
    )
  }

  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      <div className="text-center mb-6">
        <p className="text-lg font-semibold text-white mb-1">Hora de decolar!</p>
        <p className="text-sm text-slate-400">
          Aperte no foguete até ele decolar para receber sua trilha de aprendizagem
        </p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Combustível</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: accent }}
          />
        </div>
      </div>

      <div className="relative flex flex-col items-center min-h-[140px]">
        {!launched && (
          <p className="text-xs text-slate-500 mb-3 animate-pulse">
            Toque no foguete ({TAPS_TO_LAUNCH - taps} {TAPS_TO_LAUNCH - taps === 1 ? 'toque' : 'toques'} restantes)
          </p>
        )}

        <button
          type="button"
          onClick={handleRocketTap}
          disabled={launched}
          className={cn(
            'relative z-10 text-7xl leading-none transition-transform select-none',
            !launched && 'cursor-pointer hover:scale-110 active:scale-95',
            shake && !launched && 'scale-110',
            launched && 'rocket-launch-animation',
          )}
          aria-label="Aperte no foguete até decolar"
        >
          🚀
        </button>

        {launched && !revealed && (
          <p className="mt-4 text-sm font-medium animate-pulse" style={{ color: accent }}>
            Decolando...
          </p>
        )}

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-3 rounded-full bg-orange-500/30 blur-md" />
      </div>
    </div>
  )
}
