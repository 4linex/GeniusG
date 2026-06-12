import { useMemo } from 'react'

const EMOJIS = ['⭐', '✨', '🎯', '📚', '💫', '🌟', '🎉', '🔥', '💡', '🚀', '🏆', '🌈']

interface FloatingEmoji {
  id: number
  emoji: string
  left: number
  delay: number
  duration: number
  size: number
}

export function GamifiedEmojiBackground() {
  const items = useMemo<FloatingEmoji[]>(() => {
    return Array.from({ length: 18 }, (_, id) => ({
      id,
      emoji: EMOJIS[id % EMOJIS.length],
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 10 + Math.random() * 8,
      size: 16 + Math.random() * 20,
    }))
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
      {items.map((item) => (
        <span
          key={item.id}
          className="gamified-float-emoji absolute select-none opacity-0"
          style={{
            left: `${item.left}%`,
            fontSize: `${item.size}px`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  )
}
