export type ImageAlign = 'left' | 'center' | 'right' | 'justify'

export const IMAGE_BLOCK_CLASS = 'rich-text-image-block'

export function findEditorImage(target: EventTarget | null): HTMLImageElement | null {
  if (!(target instanceof HTMLElement)) return null
  if (target.tagName === 'IMG') return target as HTMLImageElement
  return target.closest('img')
}

function editorContentWidth(editor: HTMLElement): number {
  return Math.max(editor.clientWidth - 32, 120)
}

export function applyImageWidthPercent(img: HTMLImageElement, widthPercent: number): void {
  const pct = Math.max(15, Math.min(100, Math.round(widthPercent)))
  img.style.width = `${pct}%`
  img.style.maxWidth = '100%'
  img.style.height = 'auto'
}

export function getImageWidthPercent(img: HTMLImageElement, editor: HTMLElement): number {
  const editorWidth = editorContentWidth(editor)
  const current = img.getBoundingClientRect().width
  return Math.round((current / editorWidth) * 100)
}

export function resizeImageByPixels(
  img: HTMLImageElement,
  editor: HTMLElement,
  widthPx: number,
): void {
  const editorWidth = editorContentWidth(editor)
  const clamped = Math.max(80, Math.min(editorWidth, widthPx))
  applyImageWidthPercent(img, (clamped / editorWidth) * 100)
}

export function resizeImageByStep(
  img: HTMLImageElement,
  editor: HTMLElement,
  stepPercent: number,
): void {
  const current = getImageWidthPercent(img, editor)
  applyImageWidthPercent(img, current + stepPercent)
}

export function styleNewEditorImage(img: HTMLImageElement): void {
  img.className = 'rich-text-image'
  img.alt = ''
  img.style.width = '80%'
  img.style.maxWidth = '100%'
  img.style.height = 'auto'
  img.style.display = 'block'
  img.style.borderRadius = '0.75rem'
}

export function ensureImageBlock(img: HTMLImageElement): HTMLElement {
  const parent = img.parentElement
  if (parent?.classList.contains(IMAGE_BLOCK_CLASS)) return parent

  const block = document.createElement('div')
  block.className = IMAGE_BLOCK_CLASS
  block.dataset.align = 'center'
  img.parentNode?.insertBefore(block, img)
  block.appendChild(img)
  return block
}

export function getImageAlign(img: HTMLImageElement): ImageAlign {
  const block = img.parentElement
  const align = block?.dataset.align as ImageAlign | undefined
  if (align === 'left' || align === 'center' || align === 'right' || align === 'justify') {
    return align
  }
  return 'center'
}

export function applyImageAlign(img: HTMLImageElement, align: ImageAlign): void {
  const block = ensureImageBlock(img)
  block.dataset.align = align
  block.style.textAlign = align === 'justify' ? 'left' : align
  block.style.width = '100%'
  block.style.margin = '0'
  block.style.padding = '0'

  img.style.display = 'block'
  img.style.maxWidth = '100%'
  img.style.height = 'auto'
  img.style.marginTop = '0.75rem'
  img.style.marginBottom = '0.75rem'
  img.style.borderRadius = '0.75rem'

  switch (align) {
    case 'left':
      if (!img.style.width || img.style.width === '100%') img.style.width = '80%'
      img.style.marginLeft = '0'
      img.style.marginRight = 'auto'
      break
    case 'center':
      if (!img.style.width || img.style.width === '100%') img.style.width = '80%'
      img.style.marginLeft = 'auto'
      img.style.marginRight = 'auto'
      break
    case 'right':
      if (!img.style.width || img.style.width === '100%') img.style.width = '80%'
      img.style.marginLeft = 'auto'
      img.style.marginRight = '0'
      break
    case 'justify':
      img.style.width = '100%'
      img.style.marginLeft = '0'
      img.style.marginRight = '0'
      break
  }
}

export function createImageBlock(img: HTMLImageElement, align: ImageAlign = 'center'): HTMLElement {
  styleNewEditorImage(img)
  const block = document.createElement('div')
  block.className = IMAGE_BLOCK_CLASS
  block.appendChild(img)
  applyImageAlign(img, align)
  return block
}

export interface ImageOverlayRect {
  top: number
  left: number
  width: number
  height: number
}

export function getImageOverlayRect(
  img: HTMLImageElement,
  editor: HTMLElement,
): ImageOverlayRect {
  const editorRect = editor.getBoundingClientRect()
  const imgRect = img.getBoundingClientRect()
  return {
    top: imgRect.top - editorRect.top + editor.scrollTop,
    left: imgRect.left - editorRect.left + editor.scrollLeft,
    width: imgRect.width,
    height: imgRect.height,
  }
}
