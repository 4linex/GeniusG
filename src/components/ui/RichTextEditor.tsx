import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { isRichTextEmpty, normalizeRichTextHtml } from '@/lib/richText'
import {
  applyImageAlign,
  createImageBlock,
  findEditorImage,
  getImageAlign,
  getImageOverlayRect,
  getImageWidthPercent,
  resizeImageByPixels,
  resizeImageByStep,
  type ImageAlign,
  type ImageOverlayRect,
} from '@/lib/richTextImageResize'
import { uploadQuestionImage } from '@/lib/uploadQuestionImage'
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
  /** Permite inserir imagens inline no texto (estilo Google Docs). */
  enableImages?: boolean
  onImageUploadError?: (message: string) => void
}

function ToolbarButton({
  onClick,
  title,
  children,
  active = false,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={cn(
        'p-2 rounded-lg transition-colors',
        active
          ? 'text-primary-300 bg-primary-500/15'
          : 'text-slate-400 hover:text-white hover:bg-white/10',
      )}
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
  enableImages = false,
  onImageUploadError,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const syncingRef = useRef(false)
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const [empty, setEmpty] = useState(() => isRichTextEmpty(value))
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [imageOverlay, setImageOverlay] = useState<ImageOverlayRect | null>(null)

  const getSelectedImage = useCallback((): HTMLImageElement | null => {
    if (!selectedImageId || !editorRef.current) return null
    return editorRef.current.querySelector(
      `img[data-rich-image-id="${selectedImageId}"]`,
    ) as HTMLImageElement | null
  }, [selectedImageId])

  const clearImageSelection = useCallback(() => {
    const editor = editorRef.current
    if (editor) {
      editor.querySelectorAll('img.rich-text-image-selected').forEach((node) => {
        node.classList.remove('rich-text-image-selected')
      })
    }
    setSelectedImageId(null)
    setImageOverlay(null)
  }, [])

  const selectImage = useCallback(
    (img: HTMLImageElement) => {
      const editor = editorRef.current
      if (!editor) return

      if (!img.dataset.richImageId) {
        img.dataset.richImageId = crypto.randomUUID()
      }

      editor.querySelectorAll('img.rich-text-image-selected').forEach((node) => {
        node.classList.remove('rich-text-image-selected')
      })
      img.classList.add('rich-text-image-selected')
      setSelectedImageId(img.dataset.richImageId)
      setImageOverlay(getImageOverlayRect(img, editor))
    },
    [],
  )

  const refreshImageOverlay = useCallback(() => {
    const editor = editorRef.current
    const img = getSelectedImage()
    if (!editor || !img) {
      setImageOverlay(null)
      return
    }
    setImageOverlay(getImageOverlayRect(img, editor))
  }, [getSelectedImage])

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
    clearImageSelection()
  }, [value, clearImageSelection])

  useLayoutEffect(() => {
    if (!enableImages || !selectedImageId) return
    refreshImageOverlay()
    const editor = editorRef.current
    if (!editor) return

    const onScroll = () => refreshImageOverlay()
    editor.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onScroll)
    return () => {
      editor.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [enableImages, selectedImageId, refreshImageOverlay, value])

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
    const img = getSelectedImage()
    if (img && enableImages) {
      applyImageAlign(img, align as ImageAlign)
      refreshImageOverlay()
      commit()
      return
    }

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

  const insertImageAtCursor = useCallback(
    (url: string) => {
      const editor = editorRef.current
      if (!editor) return

      focusEditor()

      const img = document.createElement('img')
      img.src = url
      img.dataset.richImageId = crypto.randomUUID()
      const wrapper = createImageBlock(img, 'center')

      const selection = window.getSelection()
      if (selection?.rangeCount) {
        const range = selection.getRangeAt(0)
        if (editor.contains(range.commonAncestorContainer)) {
          range.collapse(false)
          range.insertNode(wrapper)
          range.setStartAfter(wrapper)
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)
          commit()
          requestAnimationFrame(() => selectImage(img))
          return
        }
      }

      editor.appendChild(wrapper)
      commit()
      requestAnimationFrame(() => selectImage(img))
    },
    [commit, selectImage],
  )

  const uploadAndInsertImage = useCallback(
    async (file: File) => {
      setUploadingImage(true)
      try {
        const url = await uploadQuestionImage(file)
        insertImageAtCursor(url)
      } catch (err) {
        onImageUploadError?.(err instanceof Error ? err.message : 'Erro ao enviar imagem')
      } finally {
        setUploadingImage(false)
      }
    },
    [insertImageAtCursor, onImageUploadError],
  )

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    await uploadAndInsertImage(file)
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!enableImages) return

    const file = [...e.clipboardData.items]
      .map((item) => (item.type.startsWith('image/') ? item.getAsFile() : null))
      .find(Boolean)

    if (!file) return

    e.preventDefault()
    await uploadAndInsertImage(file)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    if (!enableImages) return

    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
    if (!file) return

    e.preventDefault()
    await uploadAndInsertImage(file)
  }

  const adjustSelectedImage = (step: number) => {
    const editor = editorRef.current
    const img = getSelectedImage()
    if (!editor || !img) return
    resizeImageByStep(img, editor, step)
    refreshImageOverlay()
    commit()
  }

  const handleEditorMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableImages) return
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) return

    const img = findEditorImage(e.target)
    if (img && editorRef.current?.contains(img)) {
      e.preventDefault()
      selectImage(img)
      return
    }

    clearImageSelection()
  }

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const img = getSelectedImage()
    if (!editorRef.current || !img) return

    resizeStateRef.current = {
      startX: e.clientX,
      startWidth: img.getBoundingClientRect().width,
    }

    const onMove = (ev: MouseEvent) => {
      const state = resizeStateRef.current
      const editor = editorRef.current
      const imgEl = getSelectedImage()
      if (!state || !editor || !imgEl) return

      const delta = ev.clientX - state.startX
      resizeImageByPixels(imgEl, editor, state.startWidth + delta)
      refreshImageOverlay()
    }

    const onUp = () => {
      resizeStateRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      commit()
      refreshImageOverlay()
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const selectedImage = getSelectedImage()
  const selectedWidthLabel =
    selectedImage && editorRef.current
      ? `${getImageWidthPercent(selectedImage, editorRef.current)}%`
      : null
  const selectedImageAlign = selectedImage ? getImageAlign(selectedImage) : null
  const alignTitle = (side: string) =>
    selectedImage ? `Posição da imagem: ${side}` : `Alinhar texto à ${side}`

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
          <ToolbarButton
            active={selectedImage ? selectedImageAlign === 'left' : false}
            onClick={() => applyAlign('left')}
            title={alignTitle('esquerda')}
          >
            <AlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton
            active={selectedImage ? selectedImageAlign === 'center' : false}
            onClick={() => applyAlign('center')}
            title={alignTitle('centro')}
          >
            <AlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton
            active={selectedImage ? selectedImageAlign === 'right' : false}
            onClick={() => applyAlign('right')}
            title={alignTitle('direita')}
          >
            <AlignRight size={16} />
          </ToolbarButton>
          <ToolbarButton
            active={selectedImage ? selectedImageAlign === 'justify' : false}
            onClick={() => applyAlign('justify')}
            title={selectedImage ? 'Imagem em largura total' : 'Justificar texto'}
          >
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
          {enableImages && (
            <>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <ToolbarButton
                onClick={() => fileInputRef.current?.click()}
                title="Inserir imagem no texto"
              >
                <ImagePlus size={16} className={uploadingImage ? 'opacity-50' : ''} />
              </ToolbarButton>
              {selectedImage && (
                <>
                  <ToolbarButton onClick={() => adjustSelectedImage(-10)} title="Diminuir imagem">
                    <ZoomOut size={16} />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => adjustSelectedImage(10)} title="Aumentar imagem">
                    <ZoomIn size={16} />
                  </ToolbarButton>
                  {selectedWidthLabel && (
                    <span className="px-2 text-xs text-primary-300 font-medium tabular-nums">
                      {selectedWidthLabel}
                    </span>
                  )}
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
              />
            </>
          )}
        </div>

        <div className="relative rounded-b-xl">
          {empty && (
            <p className="pointer-events-none absolute left-4 top-3 text-sm text-slate-500 select-none">
              {enableImages
                ? 'Digite o enunciado... Clique na imagem para alinhar e redimensionar.'
                : 'Digite o enunciado...'}
            </p>
          )}
          {enableImages && imageOverlay && selectedImageId && (
            <div className="pointer-events-none absolute inset-0 z-[2]">
              <div
                className="absolute border-2 border-primary-500/80 rounded-lg"
                style={{
                  top: imageOverlay.top,
                  left: imageOverlay.left,
                  width: imageOverlay.width,
                  height: imageOverlay.height,
                  position: 'absolute',
                }}
              >
                <span className="rich-text-image-size-badge">{selectedWidthLabel}</span>
                <button
                  type="button"
                  data-resize-handle
                  aria-label="Redimensionar imagem"
                  onMouseDown={handleResizeMouseDown}
                  className="rich-text-image-resize-handle pointer-events-auto absolute"
                  style={{
                    right: -6,
                    bottom: -6,
                  }}
                />
              </div>
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            role="textbox"
            aria-multiline
            suppressContentEditableWarning
            onInput={commit}
            onBlur={commit}
            onMouseDown={handleEditorMouseDown}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => {
              if (enableImages && [...e.dataTransfer.types].includes('Files')) {
                e.preventDefault()
              }
            }}
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
