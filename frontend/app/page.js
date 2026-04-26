'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API = 'http://localhost:3001'

export default function HomePage() {
  const router = useRouter()

  // Election creation form
  const [title, setTitle] = useState('')
  const [candidates, setCandidates] = useState(['', '', ''])
  const [createError, setCreateError] = useState('')

  // Vote entry
  const [voteCode, setVoteCode] = useState('')
  const [voteError, setVoteError] = useState('')

  // Delete all
  const [deleteMsg, setDeleteMsg] = useState('')

  function addCandidate() {
    if (candidates.length < 8) {
      setCandidates([...candidates, ''])
    }
  }

  function removeCandidate(index) {
    if (candidates.length > 3) {
      setCandidates(candidates.filter((_, i) => i !== index))
    }
  }

  function updateCandidate(index, value) {
    const updated = [...candidates]
    updated[index] = value
    setCandidates(updated)
  }

  async function createElection() {
    setCreateError('')
    const trimmedTitle = title.trim()
    const trimmedCandidates = candidates.map(c => c.trim()).filter(c => c)

    if (!trimmedTitle) {
      setCreateError('Election title is required')
      return
    }
    if (trimmedCandidates.length < 3) {
      setCreateError('At least 3 non-empty candidate names required')
      return
    }
    if (new Set(trimmedCandidates).size !== trimmedCandidates.length) {
      setCreateError('Candidate names must be distinct')
      return
    }

    try {
      const res = await fetch(`${API}/api/elections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle, candidates: trimmedCandidates }),
      })
      if (!res.ok) {
        const err = await res.json()
        setCreateError(err.error || 'Failed to create election')
        return
      }
      const data = await res.json()
      router.push(`/elections/${data.code}`)
    } catch (e) {
      setCreateError('Network error: ' + e.message)
    }
  }

  async function goVote() {
    setVoteError('')
    const code = voteCode.trim().toUpperCase()
    if (!code) {
      setVoteError('Please enter an election code')
      return
    }
    try {
      const res = await fetch(`${API}/api/elections/${code}`)
      if (!res.ok) {
        setVoteError('Election not found')
        return
      }
      const data = await res.json()
      if (data.status !== 'open') {
        setVoteError('This election is closed')
        return
      }
      router.push(`/vote/${code}`)
    } catch (e) {
      setVoteError('Network error: ' + e.message)
    }
  }

  async function deleteAll() {
    setDeleteMsg('')
    try {
      await fetch(`${API}/api/elections/all`, { method: 'DELETE' })
      setDeleteMsg('All elections deleted.')
      setTitle('')
      setCandidates(['', '', ''])
      setVoteCode('')
      setCreateError('')
      setVoteError('')
    } catch (e) {
      setDeleteMsg('Error: ' + e.message)
    }
  }

  return (
    <div className="container">
      <h1>Ranked Choice Voting</h1>

      {/* Create election */}
      <div className="card">
        <h2>Create New Election</h2>

        <div className="mb-2">
          <label>Election Title</label>
          <input
            type="text"
            data-testid="election-title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter election title"
          />
        </div>

        <div className="mb-2">
          <label>Candidates</label>
          {candidates.map((c, i) => (
            <div key={i} className="candidate-row">
              <input
                type="text"
                data-testid={`candidate-input-${i}`}
                value={c}
                onChange={e => updateCandidate(i, e.target.value)}
                placeholder={`Candidate ${i + 1}`}
                style={{ marginBottom: 0 }}
              />
              {candidates.length > 3 && (
                <button
                  className="btn-danger btn-sm"
                  data-testid={`remove-candidate-btn-${i}`}
                  onClick={() => removeCandidate(i)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {candidates.length < 8 && (
          <button
            className="btn-secondary btn-sm mb-2"
            data-testid="add-candidate-btn"
            onClick={addCandidate}
          >
            + Add Candidate
          </button>
        )}

        {createError && <div className="error-message mb-2">{createError}</div>}

        <button data-testid="create-election-btn" onClick={createElection}>
          Create Election
        </button>
      </div>

      {/* Vote entry */}
      <div className="card">
        <h2>Vote in an Election</h2>
        <div className="flex-row mb-2">
          <input
            type="text"
            data-testid="election-code-input"
            value={voteCode}
            onChange={e => setVoteCode(e.target.value)}
            placeholder="Enter election code (e.g. VOTE-1234)"
            style={{ marginBottom: 0 }}
          />
          <button data-testid="go-vote-btn" onClick={goVote}>
            Go Vote
          </button>
        </div>
        {voteError && <div className="error-message">{voteError}</div>}
      </div>

      {/* Delete all */}
      <div className="card">
        <button className="btn-danger" data-testid="delete-all-btn" onClick={deleteAll}>
          Delete All Elections
        </button>
        {deleteMsg && <div className="mt-1" style={{ color: '#6b7280' }}>{deleteMsg}</div>}
      </div>
    </div>
  )
}
