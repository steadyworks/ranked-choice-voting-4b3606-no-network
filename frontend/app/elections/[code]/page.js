'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

const API = 'http://localhost:3001'

function RoundsTable({ rounds }) {
  if (!rounds || rounds.length === 0) {
    return <p style={{ color: '#6b7280' }}>No votes yet.</p>
  }

  // Collect all candidate names that appear across all rounds
  const allCandidates = []
  const seen = new Set()
  for (const round of rounds) {
    for (const name of Object.keys(round.votes)) {
      if (!seen.has(name)) {
        seen.add(name)
        allCandidates.push(name)
      }
    }
  }

  return (
    <table className="results-table">
      <thead>
        <tr>
          <th>Round</th>
          {allCandidates.map(c => (
            <th key={c}>{c}</th>
          ))}
          <th>Exhausted</th>
          <th>Eliminated</th>
        </tr>
      </thead>
      <tbody>
        {rounds.map((round, idx) => (
          <tr key={idx} data-testid={`round-${idx + 1}`}>
            <td>{idx + 1}</td>
            {allCandidates.map(c => {
              const votes = round.votes[c]
              const isEliminated = round.eliminated === c
              return (
                <td key={c} className={isEliminated ? 'eliminated-cell' : ''}>
                  {votes !== undefined ? votes : '-'}
                  {isEliminated && (
                    <span className="eliminated-badge">out</span>
                  )}
                </td>
              )
            })}
            <td>{round.exhausted}</td>
            <td>{round.eliminated || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function OrganizerView() {
  const { code } = useParams()
  const router = useRouter()

  const [election, setElection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)

  const fetchElection = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/elections/${code}`)
      if (!res.ok) {
        setError('Election not found')
        setLoading(false)
        return
      }
      const data = await res.json()
      setElection(data)
      setLoading(false)
      setError('')
    } catch (e) {
      setError('Network error: ' + e.message)
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    fetchElection()
  }, [fetchElection])

  // Poll for updates every 3 seconds while open
  useEffect(() => {
    const interval = setInterval(() => {
      if (election?.status === 'open') {
        fetchElection()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [election?.status, fetchElection])

  async function closeElection() {
    setClosing(true)
    try {
      const res = await fetch(`${API}/api/elections/${code}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        await fetchElection()
      }
    } catch (e) {
      console.error('Failed to close election', e)
    }
    setClosing(false)
  }

  async function deleteAll() {
    try {
      await fetch(`${API}/api/elections/all`, { method: 'DELETE' })
      router.push('/')
    } catch (e) {
      console.error('Failed to delete all', e)
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>
  if (error) return <div className="container"><div className="error-message">{error}</div></div>
  if (!election) return <div className="container"><p>Election not found</p></div>

  const isOpen = election.status === 'open'
  const rounds = election.rounds || []
  const winner = election.winner

  return (
    <div className="container">
      <h1>Organizer View</h1>

      <div className="card">
        <h2 data-testid="election-title">{election.title}</h2>
        <div className="mb-1">
          <strong>Code: </strong>
          <span className="code-box" data-testid="election-code">{election.code}</span>
        </div>
        <div className="mb-1">
          <strong>Status: </strong>
          <span
            data-testid="election-status"
            className={isOpen ? 'status-open' : 'status-closed'}
          >
            {isOpen ? 'Open' : 'Closed'}
          </span>
        </div>
        <div className="mb-2">
          <strong>Candidates:</strong>
          <ul style={{ listStyle: 'none', marginTop: '0.5rem' }}>
            {(election.candidates || []).map(c => (
              <li key={c} style={{ padding: '0.2rem 0' }}>{c}</li>
            ))}
          </ul>
        </div>

        {isOpen && (
          <button
            data-testid="close-election-btn"
            className="btn-danger"
            onClick={closeElection}
            disabled={closing}
          >
            {closing ? 'Closing...' : 'Close Election'}
          </button>
        )}
      </div>

      {/* Preliminary results (while open) */}
      {isOpen && (
        <div className="card" data-testid="preliminary-results">
          <h3>Preliminary Results (Live)</h3>
          <RoundsTable rounds={rounds} />
        </div>
      )}

      {/* Final results (after closed) */}
      {!isOpen && (
        <div className="card" data-testid="results-panel">
          <h3>Final Results</h3>
          {winner && (
            <div className="winner-box">
              Winner: <span data-testid="winner">{winner}</span>
            </div>
          )}
          <RoundsTable rounds={rounds} />
        </div>
      )}

      <div className="card">
        <button className="btn-danger" data-testid="delete-all-btn" onClick={deleteAll}>
          Delete All Elections
        </button>
      </div>
    </div>
  )
}
