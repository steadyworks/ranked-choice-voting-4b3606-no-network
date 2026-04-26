'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const API = 'http://localhost:3001'

function toSlug(name) {
  return name.replace(/\s+/g, '-').toLowerCase()
}

export default function VoterView() {
  const { code } = useParams()

  const [election, setElection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [voterName, setVoterName] = useState('')
  const [ranking, setRanking] = useState([]) // ordered list of candidate names
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadElection() {
      try {
        const res = await fetch(`${API}/api/elections/${code}`)
        if (!res.ok) {
          setLoadError('Election not found')
          setLoading(false)
          return
        }
        const data = await res.json()
        setElection(data)
        setRanking(data.candidates || [])
        setLoading(false)
      } catch (e) {
        setLoadError('Network error: ' + e.message)
        setLoading(false)
      }
    }
    loadElection()
  }, [code])

  function moveUp(index) {
    if (index === 0) return
    const newRanking = [...ranking]
    ;[newRanking[index - 1], newRanking[index]] = [newRanking[index], newRanking[index - 1]]
    setRanking(newRanking)
  }

  function moveDown(index) {
    if (index === ranking.length - 1) return
    const newRanking = [...ranking]
    ;[newRanking[index], newRanking[index + 1]] = [newRanking[index + 1], newRanking[index]]
    setRanking(newRanking)
  }

  async function submitBallot() {
    setSubmitError('')
    setSubmitSuccess('')

    const name = voterName.trim()
    if (!name) {
      setSubmitError('Please enter your name')
      return
    }
    if (ranking.length === 0) {
      setSubmitError('No candidates to rank')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/elections/${code}/ballots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_name: name, ranking }),
      })
      if (res.ok) {
        setSubmitSuccess('Your ballot has been submitted!')
      } else {
        const err = await res.json()
        setSubmitError(err.error || 'Failed to submit ballot')
      }
    } catch (e) {
      setSubmitError('Network error: ' + e.message)
    }
    setSubmitting(false)
  }

  if (loading) return <div className="container"><p>Loading...</p></div>
  if (loadError) return <div className="container"><div className="error-message">{loadError}</div></div>
  if (!election) return <div className="container"><p>Election not found</p></div>

  return (
    <div className="container">
      <h1>Cast Your Vote</h1>

      <div className="card">
        <h2>{election.title}</h2>
        <div className="mb-1">
          <strong>Code:</strong> {election.code}
        </div>
        {election.status === 'closed' && (
          <div className="error-message mb-2">This election is closed.</div>
        )}
      </div>

      <div className="card">
        <div className="mb-2">
          <label><strong>Your Name</strong></label>
          <input
            type="text"
            data-testid="voter-name-input"
            value={voterName}
            onChange={e => setVoterName(e.target.value)}
            placeholder="Enter your display name"
          />
        </div>

        <div className="mb-2">
          <label><strong>Rank Candidates</strong> (drag up/down, position 1 = most preferred)</label>
          <div data-testid="candidate-ranking-list" style={{ marginTop: '0.5rem' }}>
            {ranking.map((candidate, index) => {
              const slug = toSlug(candidate)
              return (
                <div
                  key={candidate}
                  data-testid={`candidate-item-${slug}`}
                  className="ranking-item"
                >
                  <span className="ranking-position">{index + 1}.</span>
                  <span className="ranking-name">{candidate}</span>
                  <button
                    className="btn-secondary btn-sm"
                    data-testid={`move-up-btn-${slug}`}
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    aria-label={`Move ${candidate} up`}
                  >
                    ▲
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    data-testid={`move-down-btn-${slug}`}
                    onClick={() => moveDown(index)}
                    disabled={index === ranking.length - 1}
                    aria-label={`Move ${candidate} down`}
                  >
                    ▼
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <button
          data-testid="submit-ballot-btn"
          onClick={submitBallot}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Ballot'}
        </button>

        {submitError && (
          <div data-testid="ballot-error" className="error-message mt-1">
            {submitError}
          </div>
        )}

        {submitSuccess && (
          <div data-testid="ballot-success" className="success-message mt-1">
            {submitSuccess}
          </div>
        )}
      </div>
    </div>
  )
}
