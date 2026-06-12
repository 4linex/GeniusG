import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Type,
} from 'lucide-react'
import { isRichTextEmpty, normalizeRichTextHtml } from '@/lib/richText'
import { cn } from '@/lib/utils'

const FONT_SIZES = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
]

type TextAlign = 'left' | 'center' | 'right' | 'justify'

interface RichTextEditorProps {
  label?: string
  value: string
  onChange: (html: string) => void
  className?: string
  minHeight?: string
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
    >
      {children}
    </button>
  )
}

function getBlockAtSelection(root: HTMLElement): HTMLElement | null {
  const sel = window.getSelection()
  if (!sel?.rangeCount) return null

  let node: Node | null = sel.anchorNode
  while (node && node !== root) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.tagName === 'DIV' || el.tagName === 'P') return el
    }
    node = node.parentNode
  }
  return null
}

function ensureBlock(root: HTMLElement): HTMLElement | null {
  let block = getBlockAtSelection(root)
  if (block) return block

  const sel = window.getSelection()
  if (!sel?.rangeCount) return null

  const range = sel.getRangeAt(0)
  const div = document.createElement('div')
  div.style.textAlign = 'left'

  if (range.collapsed) {
    div.appendChild(document.createElement('br'))
    range.insertNode(div)
  } else {
    try {
      range.surroundContents(div)
    } catch {
      div.appendChild(range.extractContents())
      range.insertNode(div)
    }
  }

  sel.removeAllRanges()
  const newRange = document.createRange()
  newRange.selectNodeContents(div)
  newRange.collapse(false)
  sel.addRange(newRange)

  return div
}

export function RichTextEditor({
  label,
  value,
  onChange,
  className,
  minHeight = '120px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)
  const [empty, setEmpty] = useState(() => isRichTextEmpty(value))

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    try {
      document.execCommand('styleWithCSS', false, 'true')
      document.execCommand('defaultParagraphSeparator', false, 'div')
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const el = editorRef.current
    if (!el || syncingRef.current) return

    const normalized = normalizeRichTextHtml(value)
    if (el.innerHTML !== normalized) {
      el.innerHTML = normalized || ''
    }
    setEmpty(isRichTextEmpty(normalized))
  }, [value])

  const commit = useCallback(() => {
    const el = editorRef.current
    if (!el) return

    const normalized = normalizeRichTextHtml(el.innerHTML)
    if (el.innerHTML !== normalized) {
      el.innerHTML = normalized
    }

    setEmpty(isRichTextEmpty(normalized))
    syncingRef.current = true
    onChange(normalized)
    requestAnimationFrame(() => {
      syncingRef.current = false
    })
  }, [onChange])

  const focusEditor = () => editorRef.current?.focus()

  const exec = (command: string, val?: string) => {
    focusEditor()
    document.execCommand(command, false, val)
    commit()
  }

  const applyAlign = (align: TextAlign) => {
    focusEditor()
    const root = editorRef.current
    if (!root) return

    const block = ensureBlock(root)
    if (block) {
      block.style.textAlign = align
      block.style.margin = '0'
      block.style.padding = '0'
    }
    commit()
  }

  const applyFontSize = (size: string) => {
    focusEditor()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (range.collapsed) return

    const span = document.createElement('span')
    span.style.fontSize = size

    try {
      range.surroundContents(span)
    } catch {
      span.appendChild(range.extractContents())
      range.insertNode(span)
    }

    selection.removeAllRanges()
    commit()
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      )}

      <div className="rounded-xl border border-white/10 bg-slate-900/50 focus-within:ring-2 focus-within:ring-primary-500/40 focus-within:border-primary-500/50">
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-white/10 bg-white/[0.02] rounded-t-xl">
          <ToolbarButton onClick={() => exec('bold')} title="Negrito">
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('italic')} title="Itálico">
            <Italic size={16} />
          </ToolbarButton>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <ToolbarButton onClick={() => applyAlign('left')} title="Alinhar à esquerda">
            <AlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => applyAlign('center')} title="Centralizar">
            <AlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => applyAlign('right')} title="Alinhar à direita">
            <AlignRight size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => applyAlign('justify')} title="Justificar">
            <AlignJustify size={16} />
          </ToolbarButton>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <div className="flex items-center gap-1 pl-1">
            <Type size={14} className="text-slate-500 shrink-0" />
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) applyFontSize(e.target.value)
                e.target.value = ''
              }}
              className="bg-transparent text-xs text-slate-300 border-none outline-none cursor-pointer max-w-[88px]"
              title="Tamanho da fonte"
            >
              <option value="" disabled>
                Tamanho
              </option>
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value} className="bg-slate-900">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative rounded-b-xl">
          {empty && (
            <p className="pointer-events-none absolute left-4 top-3 text-sm text-slate-500 select-none">
              Digite o enunciado...
            </p>
          )}
          <div
            ref={editorRef}
            contentEditable
            role="textbox"
            aria-multiline
            suppressContentEditableWarning
            onInput={commit}
            onBlur={commit}
            onFocus={() => {
              try {
                document.execCommand('styleWithCSS', false, 'true')
              } catch {
                /* ignore */
              }
            }}
            className={cn(
              'rich-text-content rich-text-editor-body',
              'w-full min-w-0 px-4 py-3 text-sm leading-relaxed outline-none',
              'overflow-x-hidden overflow-y-auto break-words',
            )}
            style={{ minHeight }}
          />
        </div>
      </div>
    </div>
  )
}
