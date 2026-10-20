import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import './App.css'
import { downloadPoster } from './drawPoster.ts'
import {
  POSTER_BG,
  POSTER_FONT,
  POSTER_HEIGHT,
  POSTER_WIDTH,
  layoutToCss,
  loadLayout,
  saveLayout,
  type FrameStyle,
  type PosterLayout,
  type TextStyle,
} from './posterLayout.ts'

function useSlotScale() {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(0.22)

  useEffect(() => {
    if (!slot) return
    const update = () => {
      const width = slot.clientWidth
      const height = slot.clientHeight
      if (width <= 0 || height <= 0) return
      setScale(Math.min(width / POSTER_WIDTH, height / POSTER_HEIGHT))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(slot)
    return () => observer.disconnect()
  }, [slot])

  return { setSlot, scale }
}

function Slider(props: {
  label: string
  min: number
  max: number
  step: number
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const shown = props.step < 1 ? props.value.toFixed(2) : String(Math.round(props.value))
  return (
    <label className={`slider${props.disabled ? ' slider--locked' : ''}`}>
      <span className="slider-label">
        <span>{props.label}</span>
        <span>{shown}</span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </label>
  )
}

function PlacementSettings(props: {
  value: TextStyle
  locked: boolean
  onChange: (next: TextStyle) => void
}) {
  const set = <K extends keyof TextStyle>(key: K, next: TextStyle[K]) => {
    props.onChange({ ...props.value, [key]: next })
  }
  return (
    <>
      <Slider
        label="X"
        min={0}
        max={POSTER_WIDTH}
        step={1}
        value={props.value.x}
        disabled={props.locked}
        onChange={(value) => set('x', value)}
      />
      <Slider
        label="Y"
        min={0}
        max={POSTER_HEIGHT}
        step={1}
        value={props.value.y}
        disabled={props.locked}
        onChange={(value) => set('y', value)}
      />
      <Slider
        label="Font size"
        min={12}
        max={200}
        step={1}
        value={props.value.fontSize}
        disabled={props.locked}
        onChange={(value) => set('fontSize', value)}
      />
    </>
  )
}

function TextSettings(props: {
  title: string
  value: TextStyle
  onChange: (next: TextStyle) => void
}) {
  const set = <K extends keyof TextStyle>(key: K, next: TextStyle[K]) => {
    props.onChange({ ...props.value, [key]: next })
  }
  return (
    <fieldset>
      <legend>{props.title}</legend>
      <Slider
        label="Max width"
        min={100}
        max={POSTER_WIDTH}
        step={1}
        value={props.value.maxWidth}
        onChange={(value) => set('maxWidth', value)}
      />
      <label className="color">
        Color
        <input type="color" value={props.value.color} onChange={(event) => set('color', event.target.value)} />
      </label>
      <label className="check">
        Bold
        <input
          type="checkbox"
          checked={props.value.bold}
          onChange={(event) => set('bold', event.target.checked)}
        />
      </label>
    </fieldset>
  )
}

function PosterPreview(props: {
  scale: number
  layout: PosterLayout
  name: string
  shopName: string
  photoUrl: string | null
}) {
  const { layout } = props
  return (
    <div className="stage" style={{ width: POSTER_WIDTH * props.scale, height: POSTER_HEIGHT * props.scale }}>
      <div className="poster" style={{ transform: `scale(${props.scale})` }}>
        <img className="bg" src={POSTER_BG} alt="" draggable={false} />
        {props.photoUrl && (
          <div
            className="frame"
            style={{
              left: layout.frame.x,
              top: layout.frame.y,
              width: layout.frame.width,
              height: layout.frame.height,
              borderRadius: layout.frame.radius,
            }}
          >
            <img src={props.photoUrl} alt="" draggable={false} style={{ transform: `scale(${layout.frame.zoom})` }} />
          </div>
        )}
        <PosterText text={props.name} style={layout.name} />
        <PosterText text={props.shopName} style={layout.shop} />
      </div>
    </div>
  )
}

function PosterText(props: { text: string; style: TextStyle }) {
  const trimmed = props.text.trim()
  if (!trimmed) return null
  return (
    <p
      className="poster-text"
      style={{
        left: props.style.x,
        top: props.style.y,
        width: props.style.maxWidth,
        fontSize: props.style.fontSize,
        color: props.style.color,
        fontWeight: props.style.bold ? 700 : 400,
        fontFamily: `"${POSTER_FONT}", sans-serif`,
      }}
    >
      {trimmed}
    </p>
  )
}

export default function App() {
  const dev = new URLSearchParams(window.location.search).get('dev') === '1'
  const { setSlot, scale } = useSlotScale()
  const [layout, setLayout] = useState<PosterLayout>(() => loadLayout(dev))
  const [name, setName] = useState('')
  const [shopName, setShopName] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [layoutLocked, setLayoutLocked] = useState(true)
  const cssRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!photoUrl) return
    return () => URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  function commit(next: PosterLayout) {
    setLayout(next)
    if (dev) saveLayout(next)
  }

  function setFrame<K extends keyof FrameStyle>(key: K, value: FrameStyle[K]) {
    commit({ ...layout, frame: { ...layout.frame, [key]: value } })
  }

  function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setPhotoUrl(URL.createObjectURL(file))
  }

  async function onCopyCss() {
    const css = layoutToCss(layout)
    const box = cssRef.current
    if (box) {
      box.focus()
      box.select()
    }
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    if (!ok) {
      try {
        await navigator.clipboard.writeText(css)
        ok = true
      } catch {
        ok = false
      }
    }
    if (ok) {
      setError('')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } else {
      setError('Text is selected. Press Ctrl+C.')
    }
  }

  async function onDownload() {
    setBusy(true)
    setError('')
    try {
      await downloadPoster({ name, shopName, photoUrl, layout })
    } catch {
      setError('Download failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <div className="poster-slot" ref={setSlot}>
        <PosterPreview scale={scale} layout={layout} name={name} shopName={shopName} photoUrl={photoUrl} />
      </div>
      <aside className="panel">
        <div className="lock-bar">
          <p className="lock-text">
            {layoutLocked
              ? 'Position and size are locked.'
              : 'You can adjust position and size.'}
          </p>
          <button
            className="lock-toggle"
            type="button"
            aria-pressed={!layoutLocked}
            onClick={() => setLayoutLocked((locked) => !locked)}
          >
            {layoutLocked ? 'Unlock' : 'Lock'}
          </button>
        </div>
        <fieldset>
          <legend>Name</legend>
          <label className="field">
            Text on poster
            <input
              type="text"
              value={name}
              placeholder="Enter name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {!layoutLocked && <p className="group-note">Position and size</p>}
          <PlacementSettings
            locked={layoutLocked}
            value={layout.name}
            onChange={(next) => commit({ ...layout, name: next })}
          />
        </fieldset>
        <fieldset>
          <legend>Shop name</legend>
          <label className="field">
            Text on poster
            <input
              type="text"
              value={shopName}
              placeholder="Enter shop name"
              onChange={(event) => setShopName(event.target.value)}
            />
          </label>
          {!layoutLocked && <p className="group-note">Position and size</p>}
          <PlacementSettings
            locked={layoutLocked}
            value={layout.shop}
            onChange={(next) => commit({ ...layout, shop: next })}
          />
        </fieldset>
        <fieldset>
          <legend>Image</legend>
          <label className="field">
            Choose image
            <input type="file" accept="image/*" onChange={onPhoto} />
          </label>
          {!layoutLocked && (
            <Slider
              label="Zoom"
              min={1}
              max={3}
              step={0.01}
              value={layout.frame.zoom}
              onChange={(value) => setFrame('zoom', value)}
            />
          )}
        </fieldset>
        <button className="download" type="button" onClick={onDownload} disabled={busy}>
          {busy ? 'Creating...' : 'Download PNG'}
        </button>
        {error && <p className="error">{error}</p>}
        {dev && (
          <>
            <p className="dev-note">These settings are saved in this browser.</p>
            <fieldset>
              <legend>Image frame</legend>
              <Slider label="X" min={0} max={POSTER_WIDTH} step={1} value={layout.frame.x} onChange={(value) => setFrame('x', value)} />
              <Slider label="Y" min={0} max={POSTER_HEIGHT} step={1} value={layout.frame.y} onChange={(value) => setFrame('y', value)} />
              <Slider label="Width" min={50} max={2000} step={1} value={layout.frame.width} onChange={(value) => setFrame('width', value)} />
              <Slider label="Height" min={50} max={2000} step={1} value={layout.frame.height} onChange={(value) => setFrame('height', value)} />
              <Slider
                label="Corner radius"
                min={0}
                max={500}
                step={1}
                value={layout.frame.radius}
                onChange={(value) => setFrame('radius', value)}
              />
            </fieldset>
            <TextSettings title="Name style" value={layout.name} onChange={(next) => commit({ ...layout, name: next })} />
            <TextSettings title="Shop name style" value={layout.shop} onChange={(next) => commit({ ...layout, shop: next })} />
            <textarea className="css-box" ref={cssRef} readOnly value={layoutToCss(layout)} />
            <button className="copy" type="button" onClick={onCopyCss}>
              {copied ? 'Copied' : 'Copy CSS'}
            </button>
          </>
        )}
      </aside>
    </div>
  )
}
