export const POSTER_WIDTH = 2480
export const POSTER_HEIGHT = 3268
export const POSTER_FONT = 'Noto Sans Malayalam'
export const POSTER_BG = `${import.meta.env.BASE_URL}നാനും പങ്കെടുക്കും__2.jpg`

export type TextStyle = {
  x: number
  y: number
  fontSize: number
  color: string
  bold: boolean
  maxWidth: number
}

export type FrameStyle = {
  x: number
  y: number
  width: number
  height: number
  zoom: number
  radius: number
}

export type PosterLayout = {
  frame: FrameStyle
  name: TextStyle
  shop: TextStyle
}

export const defaultLayout: PosterLayout = {
  frame: {
    x: 1377,
    y: 1143,
    width: 955,
    height: 1036,
    zoom: 1,
    radius: 29,
  },
  name: {
    x: 179,
    y: 1653,
    fontSize: 110,
    color: '#ffffff',
    bold: true,
    maxWidth: 1123,
  },
  shop: {
    x: 207,
    y: 2013,
    fontSize: 79,
    color: '#ffd100',
    bold: true,
    maxWidth: 1068,
  },
}

const DEV_STORAGE_KEY = 'njanum-poster-layout-dev'

function cloneDefaultLayout(): PosterLayout {
  return {
    frame: { ...defaultLayout.frame },
    name: { ...defaultLayout.name },
    shop: { ...defaultLayout.shop },
  }
}

/** Normal site always uses defaultLayout. Dev mode may load saved overrides. */
export function loadLayout(devMode: boolean): PosterLayout {
  if (!devMode) return cloneDefaultLayout()
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEY)
    if (!raw) return cloneDefaultLayout()
    const parsed = JSON.parse(raw) as Partial<PosterLayout>
    return {
      frame: { ...defaultLayout.frame, ...parsed.frame },
      name: { ...defaultLayout.name, ...parsed.name },
      shop: { ...defaultLayout.shop, ...parsed.shop },
    }
  } catch {
    return cloneDefaultLayout()
  }
}

export function saveLayout(layout: PosterLayout) {
  localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(layout))
}

function cssNumber(value: number) {
  return Number(value.toFixed(2)).toString()
}

function textCss(selector: string, style: TextStyle) {
  return `${selector} {
  left: ${cssNumber(style.x)}px;
  top: ${cssNumber(style.y)}px;
  width: ${cssNumber(style.maxWidth)}px;
  font-size: ${cssNumber(style.fontSize)}px;
  color: ${style.color};
  font-weight: ${style.bold ? 700 : 400};
  line-height: 1.3;
  font-family: "Noto Sans Malayalam", sans-serif;
}`
}

export function layoutToCss(layout: PosterLayout) {
  const { frame } = layout
  return `.frame {
  left: ${cssNumber(frame.x)}px;
  top: ${cssNumber(frame.y)}px;
  width: ${cssNumber(frame.width)}px;
  height: ${cssNumber(frame.height)}px;
  border-radius: ${cssNumber(frame.radius)}px;
  overflow: hidden;
}

.frame img {
  transform: scale(${cssNumber(frame.zoom)});
  transform-origin: center center;
  object-fit: cover;
}

${textCss('.name', layout.name)}

${textCss('.shop', layout.shop)}
`
}
