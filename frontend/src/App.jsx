import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'https://yattrigan.onrender.com'

function App() {
  const [formData, setFormData] = useState({
    destination: 'Jaipur',
    days: 3,
    budget: 'medium',
    style: 'cultural'
  })

  const [itinerary, setItinerary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [savedTrips, setSavedTrips] = useState([])
  const [saveStatus, setSaveStatus] = useState('')
  const [activeTab, setActiveTab] = useState('planner')

  const fetchSavedTrips = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/trips`)
      if (res.ok) {
        const data = await res.json()
        setSavedTrips(data)
      }
    } catch (err) {
      console.error("Failed to fetch saved trips:", err)
    }
  }

  useEffect(() => {
    fetchSavedTrips()
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setItinerary(null)
    setSaveStatus('')

    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: formData.destination,
          days: Number(formData.days),
          budget: formData.budget,
          style: formData.style
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate itinerary. Please try again.')
      }

      const data = await response.json()
      setItinerary(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTrip = async () => {
    if (!itinerary) return
    setSaveStatus('Saving...')

    try {
      const response = await fetch(`${API_BASE_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: formData.destination,
          days: Number(formData.days),
          budget: formData.budget,
          style: formData.style,
          itinerary: itinerary
        })
      })

      if (response.ok) {
        setSaveStatus('✅ Trip Saved Successfully!')
        fetchSavedTrips()
      } else {
        setSaveStatus('❌ Failed to save trip.')
      }
    } catch (err) {
      setSaveStatus('❌ Error saving trip.')
    }
  }

  return (
    <div className="container">
      <header>
        <h1>✈️ Yattrigan</h1>
        <p>Your AI-Powered Travel Itinerary Planner</p>
        
        <div className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'planner' ? 'active' : ''}`} 
            onClick={() => setActiveTab('planner')}
          >
            🗺️ Plan New Trip
          </button>
          <button 
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('saved'); fetchSavedTrips(); }}
          >
            💾 Saved Trips ({savedTrips.length})
          </button>
        </div>
      </header>

      {activeTab === 'planner' && (
        <>
          <div className="form-card">
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Destination</label>
                <input 
                  type="text" 
                  name="destination" 
                  value={formData.destination} 
                  onChange={handleChange}
                  placeholder="e.g. Goa, Paris, Manali" 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Number of Days</label>
                <input 
                  type="number" 
                  name="days" 
                  min="1" 
                  max="10" 
                  value={formData.days} 
                  onChange={handleChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Budget</label>
                <select name="budget" value={formData.budget} onChange={handleChange}>
                  <option value="low">Budget / Backpacker</option>
                  <option value="medium">Moderate / Medium</option>
                  <option value="luxury">Luxury / Premium</option>
                </select>
              </div>

              <div className="form-group">
                <label>Travel Style</label>
                <select name="style" value={formData.style} onChange={handleChange}>
                  <option value="cultural">Cultural & Heritage</option>
                  <option value="adventure">Adventure & Nature</option>
                  <option value="relaxing">Relaxing & Leisure</option>
                  <option value="foodie">Food & Nightlife</option>
                </select>
              </div>

              <button type="submit" className="btn-submit form-group full" disabled={loading}>
                {loading ? '🔮 Planning Your Trip...' : '✨ Plan My Trip'}
              </button>
            </form>
          </div>

          {error && <div style={{ color: 'red', textAlign: 'center', margin: '15px' }}>{error}</div>}

          {itinerary && (
            <div className="itinerary-section">
              <div className="summary-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>Trip to {itinerary.destination}</h2>
                  <button className="btn-save" onClick={handleSaveTrip}>
                    💾 Save Trip
                  </button>
                </div>
                <p>{itinerary.summary}</p>
                {itinerary.estimated_cost && (
                  <span className="cost-badge">Estimated Cost: {itinerary.estimated_cost}</span>
                )}
                {saveStatus && <p className="save-msg">{saveStatus}</p>}
              </div>

              {itinerary.days?.map((dayObj, index) => (
                <div key={index} className="day-card">
                  <h3 className="day-title">Day {dayObj.day}: {dayObj.title}</h3>
                  <div className="timeline">
                    <div className="time-slot">
                      <span className="time-label">🌅 Morning:</span>
                      <span>{dayObj.morning}</span>
                    </div>
                    <div className="time-slot">
                      <span className="time-label">☀️ Afternoon:</span>
                      <span>{dayObj.afternoon}</span>
                    </div>
                    <div className="time-slot">
                      <span className="time-label">🌙 Evening:</span>
                      <span>{dayObj.evening}</span>
                    </div>
                  </div>

                  <div className="extra-info">
                    <span className="badge">🍲 <b>Food:</b> {dayObj.food}</span>
                    <span className="badge">🏨 <b>Stay:</b> {dayObj.stay}</span>
                    <span className="badge">🚕 <b>Transport:</b> {dayObj.transport}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'saved' && (
        <div className="saved-trips-section">
          <h2>Your Saved Itineraries</h2>
          {savedTrips.length === 0 ? (
            <p style={{ textAlign: 'center', margin: '30px 0', color: '#64748b' }}>No saved trips yet. Go create one!</p>
          ) : (
            savedTrips.map((item, i) => (
              <div key={i} className="saved-trip-card">
                <h3>📍 {item.destination} ({item.days} Days)</h3>
                <p><b>Style:</b> {item.style} | <b>Budget:</b> {item.budget}</p>
                <small style={{ color: '#94a3b8' }}>Saved on: {new Date(item.created_at).toLocaleDateString()}</small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default App
