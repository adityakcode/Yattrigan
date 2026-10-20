import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'https://yattrigan.onrender.com'

const DESTINATIONS = [
  { name: 'Goa', tag: 'Beaches & nightlife', em: '🏖️', c1: '#0B6B50', c2: '#2bb39a' },
  { name: 'Manali', tag: 'Mountains & snow', em: '🏔️', c1: '#1e4d7b', c2: '#5aa0d6' },
  { name: 'Jaipur', tag: 'Forts & heritage', em: '🏰', c1: '#b4531a', c2: '#FF9F43' },
  { name: 'Kerala', tag: 'Backwaters & nature', em: '🌴', c1: '#14532d', c2: '#4ade80' },
  { name: 'Varanasi', tag: 'Ghats & spirituality', em: '🛕', c1: '#7c2d12', c2: '#f59e0b' },
  { name: 'Udaipur', tag: 'Lakes & palaces', em: '🛶', c1: '#6b2d5c', c2: '#d98cc1' },
]

const STYLES = [
  { value: 'Budget & Eco-Friendly', ic: '🌱', desc: 'Low cost, sustainable' },
  { value: 'Balanced Heritage & Comfort', ic: '🏛️', desc: 'Comfort with culture' },
  { value: 'Premium & Private', ic: '💎', desc: 'Luxury and privacy' },
]

const INTERESTS = ['Nature', 'Adventure', 'Food', 'Culture', 'Shopping', 'Relaxation']
const PREFS = ['Wi-Fi', 'Parking', 'Kitchen', 'Local Food']

const go = (id) => {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function parseError(data) {
  if (!data) return 'Something went wrong. Please try again.'
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) return data.detail.map((d) => d.msg).join(', ')
  return 'Something went wrong. Please try again.'
}

function toText(it) {
  const out = [`Trip to ${it.destination}`, it.summary, '']
  ;(it.days || []).forEach((d) => {
    out.push(`Day ${d.day}: ${d.title}`, `Morning: ${d.morning}`, `Afternoon: ${d.afternoon}`)
    out.push(`Evening: ${d.evening}`, `Food: ${d.food}`, `Stay: ${d.stay}`)
    out.push(`Transport: ${d.transport}`, `Cost: ${d.day_cost}`, '')
  })
  out.push(`Estimated total: ${it.estimated_cost}`)
  return out.join('\n')
}

function Counter({ label, value, min, max, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="counter">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <b>{value}</b>
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  )
}

function Chip({ on, onClick, children }) {
  return (
    <button type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}

function Slot({ label, text }) {
  if (!text) return null
  return (
    <div className="slot">
      <div className="l">{label}</div>
      <div className="t">{text}</div>
    </div>
  )
}

function Tile({ label, text }) {
  if (!text) return null
  return (
    <div className="tile">
      <div className="l">{label}</div>
      <div className="t">{text}</div>
    </div>
  )
}

function DayCard({ day }) {
  const [open, setOpen] = useState(day.day === 1)
  return (
    <div className="day">
      <button className="day-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="day-n"><small>Day</small><b>{day.day}</b></span>
        <span className="day-t">{day.title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="day-b">
          <div className="tl">
            <Slot label="🌅 Morning" text={day.morning} />
            <Slot label="☀️ Afternoon" text={day.afternoon} />
            <Slot label="🌙 Evening" text={day.evening} />
          </div>
          <div className="tiles">
            <Tile label="🍽️ Food" text={day.food} />
            <Tile label="🏨 Stay" text={day.stay} />
            <Tile label="🚕 Transport" text={day.transport} />
            <Tile label="💰 Day cost (estimate)" text={day.day_cost} />
          </div>
        </div>
      )}
    </div>
  )
}

function Result({ it, onSave, saving, onCopy, onRegen, onEdit }) {
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.destination)}`
  return (
    <div id="results">
      <div className="res-head">
        <h2>📍 {it.destination}</h2>
        <p>{it.summary}</p>
        <div className="pills">
          <span className="pill">🗓️ {(it.days || []).length} days</span>
          <a className="pill" href={map} target="_blank" rel="noreferrer">🗺️ Open in Maps</a>
        </div>
        {it.estimated_cost && (
          <div className="total">
            <b>Estimated total</b>
            {it.estimated_cost}
            <br />
            <small>AI estimates only. Verify prices before booking.</small>
          </div>
        )}
        <div className="acts">
          {onRegen && <button className="btn light" onClick={onRegen}>🔄 Regenerate</button>}
          {onEdit && <button className="btn light" onClick={onEdit}>✏️ Edit</button>}
          {onSave && (
            <button className="btn orange" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save'}
            </button>
          )}
          <button className="btn light" onClick={onCopy}>📋 Copy</button>
          <button className="btn light" onClick={() => window.print()}>🖨️ PDF</button>
        </div>
      </div>
      {(it.days || []).map((d) => <DayCard key={d.day} day={d} />)}
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('home')
  const [menu, setMenu] = useState(false)

  const [mode, setMode] = useState('solo')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(1)
  const [ages, setAges] = useState([''])
  const [destination, setDestination] = useState('')
  const [startCity, setStartCity] = useState('')
  const [days, setDays] = useState(3)
  const [amount, setAmount] = useState('25000')
  const [style, setStyle] = useState(STYLES[1].value)
  const [interests, setInterests] = useState([])
  const [prefs, setPrefs] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [it, setIt] = useState(null)
  const [last, setLast] = useState(null)
  const [saving, setSaving] = useState(false)

  const [trips, setTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [openId, setOpenId] = useState(null)

  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const setChildCount = (n) => {
    setChildren(n)
    setAges((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ''))
  }

  const friendly = (err) =>
    err.message === 'Failed to fetch'
      ? 'Server is waking up or unreachable. Wait 30 seconds and try again.'
      : err.message

  const nav = (id) => {
    setMenu(false)
    if (view !== 'home') {
      setView('home')
      setTimeout(() => go(id), 80)
    } else {
      go(id)
    }
  }

  const pickMode = (m) => {
    setMode(m)
    if (m === 'solo') {
      setAdults(1)
      setChildCount(0)
    } else {
      setAdults(2)
      setChildCount(1)
    }
    setTimeout(() => go('planner'), 80)
  }

  const runGenerate = async (req) => {
    setError('')
    setNotice('')
    setIt(null)
    setLoading(true)
    setTimeout(() => go('results-top'), 80)
    try {
      const res = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(parseError(data))
      setIt(data)
      setLast(req)
    } catch (err) {
      setError(friendly(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const dest = destination.trim()
    if (dest.length < 2) return setError('Please enter a destination.')
    if (!(Number(amount) >= 500)) return setError('Please enter a total budget of at least ₹500.')
    if (mode === 'family' && ages.some((a) => a === '' || Number(a) < 0 || Number(a) > 17))
      return setError('Please enter each child’s age (0 to 17).')

    const who =
      mode === 'solo'
        ? 'Travelling solo (1 traveller).'
        : `Family trip: ${adults} adult(s) and ${children} child(ren)${
            children ? ` aged ${ages.join(', ')}` : ''
          }. Keep it family-friendly.`

    const notes = [
      startCity.trim() && `Starting from ${startCity.trim()}.`,
      who,
      interests.length && `Interests: ${interests.join(', ')}.`,
      prefs.length && `Preferences: ${prefs.join(', ')}.`,
      'Inside day_cost and estimated_cost include a short breakdown (stay, food, transport, activities) and an emergency buffer of about 10 percent. Label all prices as estimates. Mention one eco-friendly option where possible.',
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 800)

    runGenerate({
      destination: dest,
      days,
      budget: `Rs ${Number(amount)} total for the whole trip`,
      style,
      notes,
    })
  }

  const handleSave = async () => {
    if (!it || !last) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`${API_BASE_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: it.destination,
          days: it.days.length,
          budget: last.budget,
          style: last.style,
          itinerary: it,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(parseError(data))
      setNotice('Trip saved! Open "Saved Trips" to view it.')
    } catch (err) {
      setError(friendly(err))
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = async (itin) => {
    try {
      await navigator.clipboard.writeText(toText(itin))
      setNotice('Itinerary copied to clipboard.')
    } catch {
      setError('Could not copy. Please select and copy manually.')
    }
  }

  const loadTrips = async () => {
    setTripsLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/trips`)
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(parseError(data))
      setTrips(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(friendly(err))
    } finally {
      setTripsLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'saved') loadTrips()
  }, [view])

  const openSaved = () => {
    setMenu(false)
    setNotice('')
    setError('')
    setView('saved')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <header className="nav">
        <div className="wrap nav-in">
          <button className="brand" onClick={() => nav('top')}>🧭 Yattrigan</button>
          <nav className="links" aria-label="Main">
            <button onClick={() => nav('planner')}>Plan</button>
            <button onClick={() => nav('destinations')}>Destinations</button>
            <button onClick={() => nav('how')}>How it works</button>
            <button onClick={openSaved}>Saved Trips</button>
            <button className="cta" onClick={() => nav('planner')}>Plan My Trip</button>
          </nav>
          <button className="burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            {menu ? '✕' : '☰'}
          </button>
        </div>
        {menu && (
          <div className="mobile-menu">
            <button onClick={() => nav('planner')}>Plan a Trip</button>
            <button onClick={() => nav('destinations')}>Destinations</button>
            <button onClick={() => nav('how')}>How it works</button>
            <button onClick={openSaved}>Saved Trips</button>
            <button className="cta" onClick={() => nav('planner')}>Plan My Trip</button>
          </div>
        )}
      </header>

      <div id="top" />

      {view === 'saved' ? (
        <section className="section">
          <div className="wrap">
            <h2>Your Saved Trips</h2>
            <p className="sub">Trips you saved are stored in our database.</p>
            {error && <div className="msg err">{error}</div>}
            {tripsLoading && <div className="skel"><div className="bar" /><div className="bar" /></div>}
            {!tripsLoading && trips.length === 0 && !error && (
              <div className="skel" style={{ textAlign: 'center', color: '#5d6b63' }}>
                No saved trips yet. Plan a trip and tap Save.
              </div>
            )}
            {trips.map((t) => (
              <div className="saved-card" key={t.id}>
                <button className="saved-btn" onClick={() => setOpenId(openId === t.id ? null : t.id)}>
                  <div>
                    <b>📍 {t.destination}</b>
                    <br />
                    <small>
                      {t.days} days ·{' '}
                      {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </small>
                  </div>
                  <span>{openId === t.id ? '▲' : '▼'}</span>
                </button>
                {openId === t.id && t.itinerary && (
                  <div style={{ marginTop: 12 }}>
                    <Result it={t.itinerary} onCopy={() => handleCopy(t.itinerary)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="hero">
            <div className="wrap">
              <h1>Your Next Adventure Starts Here.</h1>
              <p>Plan smarter, travel better. Let AI turn your dream destination into a personalised travel experience.</p>
              <div className="hero-btns">
                <button className="btn orange" onClick={() => go('planner')}>✨ Plan My Trip</button>
                <button className="btn ghost" onClick={() => go('destinations')}>Explore Destinations</button>
              </div>
              <div className="trust">
                <span>🧭 Personalised Itineraries</span>
                <span>💰 Smart Budgets</span>
                <span>🍛 Local Experiences</span>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="wrap">
              <h2>Who Are You Travelling With?</h2>
              <p className="sub">Pick one and we will tailor the form for you.</p>
              <div className="who">
                <button className={`who-card ${mode === 'solo' ? 'on' : ''}`} aria-pressed={mode === 'solo'} onClick={() => pickMode('solo')}>
                  <span className="big">🎒</span>
                  <h3>Single Traveler</h3>
                  <p>Explore at your own pace, discover hidden gems, and build your perfect solo adventure.</p>
                  <span className="pick">Plan Solo Trip →</span>
                </button>
                <button className={`who-card ${mode === 'family' ? 'on' : ''}`} aria-pressed={mode === 'family'} onClick={() => pickMode('family')}>
                  <span className="big">👨‍👩‍👧‍👦</span>
                  <h3>Family Trip</h3>
                  <p>Create unforgettable family memories with comfortable stays, fun activities, and family-friendly destinations.</p>
                  <span className="pick">Plan Family Trip →</span>
                </button>
              </div>
            </div>
          </section>

          <section className="section" id="planner" style={{ paddingTop: 0 }}>
            <div className="wrap">
              <h2>Plan Your Trip</h2>
              <p className="sub">{mode === 'solo' ? 'Solo trip, 1 traveller.' : 'Family trip: add adults, children and ages.'}</p>
              <form className="panel" onSubmit={handleSubmit} noValidate>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="dest">Destination</label>
                    <input id="dest" className="input" placeholder="e.g. Jaipur, Goa, Manali" value={destination} onChange={(e) => setDestination(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="start">Starting city</label>
                    <input id="start" className="input" placeholder="e.g. Delhi" value={startCity} onChange={(e) => setStartCity(e.target.value)} />
                  </div>
                  <Counter label="Trip duration (days)" value={days} min={1} max={7} onChange={setDays} />
                  <div className="field">
                    <label htmlFor="amt">Total budget (₹)</label>
                    <input id="amt" className="input" type="number" inputMode="numeric" min="500" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                </div>

                {mode === 'family' && (
                  <div className="block">
                    <div className="grid2">
                      <Counter label="Adults" value={adults} min={1} max={8} onChange={setAdults} />
                      <Counter label="Children" value={children} min={0} max={6} onChange={setChildCount} />
                    </div>
                    {children > 0 && (
                      <div className="block">
                        <span className="lbl">Children’s ages</span>
                        <div className="chips">
                          {ages.map((a, i) => (
                            <input
                              key={i}
                              className="input"
                              style={{ width: 96 }}
                              type="number"
                              inputMode="numeric"
                              min="0"
                              max="17"
                              placeholder={`Child ${i + 1}`}
                              aria-label={`Age of child ${i + 1}`}
                              value={a}
                              onChange={(e) => setAges(ages.map((x, j) => (j === i ? e.target.value : x)))}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="block">
                  <span className="lbl">Travel style</span>
                  <div className="styles">
                    {STYLES.map((s) => (
                      <button type="button" key={s.value} className={`opt ${style === s.value ? 'on' : ''}`} aria-pressed={style === s.value} onClick={() => setStyle(s.value)}>
                        <span className="ic">{s.ic}</span>
                        <span><b>{s.value}</b><small>{s.desc}</small></span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="block">
                  <span className="lbl">Interests</span>
                  <div className="chips">
                    {INTERESTS.map((x) => (
                      <Chip key={x} on={interests.includes(x)} onClick={() => toggle(interests, setInterests, x)}>{x}</Chip>
                    ))}
                  </div>
                </div>

                <div className="block">
                  <span className="lbl">Facilities and preferences</span>
                  <div className="chips">
                    {PREFS.map((x) => (
                      <Chip key={x} on={prefs.includes(x)} onClick={() => toggle(prefs, setPrefs, x)}>{x}</Chip>
                    ))}
                  </div>
                </div>

                <button className="btn orange submit" type="submit" disabled={loading}>
                  {loading ? 'Planning your trip...' : '✨ Generate My AI Itinerary'}
                </button>
              </form>

              <div id="results-top" />
              {error && <div className="msg err">{error}</div>}
              {notice && <div className="msg ok">{notice}</div>}

              {loading && (
                <div style={{ marginTop: 14 }}>
                  <p className="progress-note">Creating your itinerary. The first request can take up to a minute while the server wakes up.</p>
                  {[1, 2, 3].map((n) => (
                    <div className="skel" key={n}>
                      <div className="bar" style={{ width: '45%' }} />
                      <div className="bar" />
                      <div className="bar" style={{ width: '80%' }} />
                    </div>
                  ))}
                </div>
              )}

              {it && !loading && (
                <div style={{ marginTop: 14 }}>
                  <Result
                    it={it}
                    onSave={handleSave}
                    saving={saving}
                    onCopy={() => handleCopy(it)}
                    onRegen={() => last && runGenerate(last)}
                    onEdit={() => go('planner')}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="section band" id="destinations">
            <div className="wrap">
              <h2>Popular Destinations</h2>
              <p className="sub">Tap a destination to start planning it.</p>
              <div className="dest-grid">
                {DESTINATIONS.map((d) => (
                  <button
                    key={d.name}
                    className="dest"
                    style={{ background: `linear-gradient(135deg, ${d.c1}, ${d.c2})` }}
                    onClick={() => {
                      setDestination(d.name)
                      go('planner')
                    }}
                  >
                    <span className="em">{d.em}</span>
                    <b>{d.name}</b>
                    <small>{d.tag}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="section">
            <div className="wrap">
              <h2>What Your Plan Looks Like</h2>
              <p className="sub">A sample layout. Your real plan is generated by AI.</p>
              <div className="sample">
                <span className="tag">Sample preview</span>
                <h3 style={{ color: '#084c39' }}>3 Days in Jaipur</h3>
                <div className="tiles" style={{ marginTop: 12 }}>
                  <Tile label="Day 1" text="Amber Fort, Jaigarh and sunset at Nahargarh" />
                  <Tile label="Food" text="Dal baati churma, pyaaz kachori" />
                  <Tile label="Stay" text="Mid-range heritage hotel" />
                  <Tile label="Cost" text="Day estimate, plus emergency buffer" />
                </div>
              </div>
            </div>
          </section>

          <section className="section band" id="how">
            <div className="wrap">
              <h2>How It Works</h2>
              <p className="sub">Three simple steps from idea to itinerary.</p>
              <div className="steps">
                <div className="step"><div className="n">1</div><h3>Enter Preferences</h3><p>Destination, days, budget and what you enjoy.</p></div>
                <div className="step"><div className="n">2</div><h3>AI Plans Your Trip</h3><p>Day-by-day plan with food, stay and transport.</p></div>
                <div className="step"><div className="n">3</div><h3>Explore & Enjoy</h3><p>Save, copy or print your plan and go.</p></div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="wrap">
              <h2>Travel Smart, Travel Light</h2>
              <p className="sub">Sustainable tourism and local tips.</p>
              <div className="cards3">
                <div className="info"><b>🌱 Eco-friendly</b><p>Prefer trains, shared transport and locally owned stays.</p></div>
                <div className="info"><b>🍛 Eat local</b><p>Try regional dishes at local eateries and support small businesses.</p></div>
                <div className="info"><b>🛡️ Keep a buffer</b><p>Hold about 10% of your budget for surprises.</p></div>
              </div>
              <p className="sub" style={{ marginTop: 18, fontSize: '0.8rem' }}>
                Sample feedback (illustrative, not real reviews): “Planning a family trip took minutes, not hours.”
              </p>
            </div>
          </section>
        </>
      )}

      <footer className="foot">
        <div className="wrap">
          <b>🧭 Yattrigan (यात्रीगण)</b>
          <div>AI-powered travel itinerary planner. Built by Aditya Kumar as a capstone project.</div>
          <div className="row">
            <a href="#top" onClick={(e) => { e.preventDefault(); nav('planner') }}>Plan a trip</a>
            <a href="https://github.com/adityakcode/Yattrigan" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}