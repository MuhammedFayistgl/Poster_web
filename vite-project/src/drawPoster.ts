import {
  POSTER_BG,
  POSTER_FONT,
  POSTER_HEIGHT,
  POSTER_WIDTH,
  type PosterLayout,
  type TextStyle,
} from './posterLayout.ts'

const LINE_HEIGHT = 1.3

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image'))
    image.src = src
  })
}

function fontOf(style: TextStyle) {
  return `${style.bold ? 700 : 400} ${style.fontSize}px "${POSTER_FONT}"`
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  const takeWord = (word: string) => {
    if (ctx.measureText(word).width <= maxWidth) {
      line = word
      return
    }
    let chunk = ''
    for (const character of word) {
      const trial = chunk + character
      if (ctx.measureText(trial).width > maxWidth && chunk) {
        lines.push(chunk)
        chunk = character
      } else {
        chunk = trial
      }
    }
    line = chunk
  }

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth) {
      line = next
    } else {
      if (line) lines.push(line)
      takeWord(word)
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawText(ctx: CanvasRenderingContext2D, text: string, style: TextStyle) {
  const trimmed = text.trim()
  if (!trimmed) return
  ctx.font = fontOf(style)
  ctx.fillStyle = style.color
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const lines = wrapText(ctx, trimmed, style.maxWidth)
  const lineHeight = style.fontSize * LINE_HEIGHT
  lines.forEach((line, index) => {
    ctx.fillText(line, style.x, style.y + index * lineHeight)
  })
}

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frame: PosterLayout['frame'],
) {
  if (image.width === 0 || image.height === 0) return
  const zoom = Math.max(frame.zoom, 0.01)
  const imageRatio = image.width / image.height
  const frameRatio = frame.width / frame.height
  let drawWidth: number
  let drawHeight: number
  if (imageRatio > frameRatio) {
    drawHeight = frame.height
    drawWidth = frame.height * imageRatio
  } else {
    drawWidth = frame.width
    drawHeight = frame.width / imageRatio
  }
  drawWidth *= zoom
  drawHeight *= zoom
  const dx = frame.x + (frame.width - drawWidth) / 2
  const dy = frame.y + (frame.height - drawHeight) / 2
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight)
}

export async function downloadPoster(input: {
  name: string
  shopName: string
  photoUrl: string | null
  layout: PosterLayout
}) {
  await document.fonts.load(fontOf(input.layout.name))
  await document.fonts.load(fontOf(input.layout.shop))
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = POSTER_WIDTH
  canvas.height = POSTER_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const background = await loadImage(POSTER_BG)
  ctx.drawImage(background, 0, 0, POSTER_WIDTH, POSTER_HEIGHT)

  if (input.photoUrl) {
    const photo = await loadImage(input.photoUrl)
    const radius = Math.max(
      0,
      Math.min(input.layout.frame.radius, input.layout.frame.width / 2, input.layout.frame.height / 2),
    )
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(
      input.layout.frame.x,
      input.layout.frame.y,
      input.layout.frame.width,
      input.layout.frame.height,
      radius,
    )
    ctx.clip()
    drawPhoto(ctx, photo, input.layout.frame)
    ctx.restore()
  }

  drawText(ctx, input.name, input.layout.name)
  drawText(ctx, input.shopName, input.layout.shop)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })
  if (!blob) throw new Error('png')

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'njanum-pankedukkum.png'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
