import {
  IMAGE_BLOCK_CLASS,
  applyImageAlign,
  ensureImageBlock,
  getImageAlign,
} from '@/lib/richTextImageResize'

export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text)
}

export function stripHtml(html: string): string {
  if (!html) return ''
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent?.trim() || ''
  }
  return html.replace(/<[^>]*>/g, '').trim()
}

const DARK_TEXT_COLORS = new Set([
  'black',
  '#000',
  '#000000',
  'rgb(0, 0, 0)',
  'rgb(0,0,0)',
  'rgba(0, 0, 0, 1)',
  'rgba(0,0,0,1)',
])

function isDarkTextColor(color: string): boolean {
  const c = color.trim().toLowerCase()
  if (DARK_TEXT_COLORS.has(c)) return true
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) {
    const [, r, g, b] = rgb.map(Number)
    return r < 40 && g < 40 && b < 40
  }
  return false
}

/** Limpa HTML gerado pelo contentEditable para exibição consistente. */
export function normalizeRichTextHtml(html: string, options?: { stripAllColors?: boolean }): string {
  if (!html.trim()) return ''
  if (typeof document === 'undefined') return html

  const root = document.createElement('div')
  root.innerHTML = html

  root.querySelectorAll('font').forEach((font) => {
    const span = document.createElement('span')
    const size = font.getAttribute('size')
    if (size) {
      const map: Record<string, string> = {
        '1': '12px',
        '2': '14px',
        '3': '16px',
        '4': '18px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
      }
      span.style.fontSize = map[size] || '16px'
    }
    span.innerHTML = font.innerHTML
    font.replaceWith(span)
  })

  root.querySelectorAll('img').forEach((node) => {
    const img = node as HTMLImageElement
    img.classList.add('rich-text-image')
    img.removeAttribute('width')
    img.removeAttribute('height')
    if (!img.getAttribute('alt')) img.setAttribute('alt', '')
    ensureImageBlock(img)
    applyImageAlign(img, getImageAlign(img))
  })

  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement
    if (el.tagName === 'IMG') return
    if (el.classList.contains(IMAGE_BLOCK_CLASS)) return
    el.removeAttribute('color')
    el.style.removeProperty('margin')
    el.style.removeProperty('padding')
    el.style.removeProperty('text-indent')
    el.style.removeProperty('width')
    el.style.removeProperty('float')

    if (options?.stripAllColors) {
      el.style.removeProperty('color')
    } else if (el.style.color && isDarkTextColor(el.style.color)) {
      el.style.removeProperty('color')
    }
  })

  const childNodes = [...root.childNodes]
  for (const node of childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      const div = document.createElement('div')
      div.style.textAlign = 'left'
      div.textContent = node.textContent
      root.replaceChild(div, node)
      continue
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const el = node as HTMLElement

    if (el.tagName === 'BR') {
      el.replaceWith(document.createElement('div'))
      continue
    }

    if (el.tagName === 'IMG') {
      const img = el as HTMLImageElement
      ensureImageBlock(img)
      applyImageAlign(img, getImageAlign(img))
      continue
    }

    if (el.classList.contains(IMAGE_BLOCK_CLASS)) {
      const img = el.querySelector('img')
      if (img) applyImageAlign(img, getImageAlign(img))
      continue
    }

    if (el.tagName !== 'DIV' && el.tagName !== 'P') {
      const div = document.createElement('div')
      div.style.textAlign = 'left'
      div.appendChild(el.cloneNode(true))
      el.replaceWith(div)
      continue
    }

    const align =
      el.style.textAlign ||
      (el.getAttribute('align') as string) ||
      'left'
    el.style.textAlign = align
    el.removeAttribute('align')
  }

  root.querySelectorAll('div, p').forEach((block) => {
    const el = block as HTMLElement
    if (el.classList.contains(IMAGE_BLOCK_CLASS)) return
    if (!el.style.textAlign) el.style.textAlign = 'left'
    if (!el.textContent?.replace(/\u200B/g, '').trim() && el.innerHTML === '<br>') {
      el.innerHTML = ''
    }
  })

  return root.innerHTML
}

export function isRichTextEmpty(html: string): boolean {
  if (!html.trim()) return true
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.innerHTML = html
    if (div.querySelector('img')) return false
  }
  return !stripHtml(html)
}
