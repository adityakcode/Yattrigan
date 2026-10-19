import { useState } from 'react'
import './App.css'

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setItinerary(null)

    try {
      const response = await fetch('http://localhost:8000/generate', {
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

  return (
    <div className="container">
      <header>
        <h1>✈️ Yattrigan</h1>
        <p>Your AI-Powered Travel Itinerary Planner</p>
      </header>

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
            <h2>Trip to {itinerary.destination}</h2>
            <p>{itinerary.summary}</p>
            {itinerary.estimated_cost && (
              <span className="cost-badge">Estimated Cost: {itinerary.estimated_cost}</span>
            )}
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
    </div>
  )
}

export default App
