# Ranked Choice Voting with Instant Runoff

Build a voting platform where organizers run elections and voters submit ranked-choice ballots. Results are computed using the Instant Runoff Voting (IRV) algorithm. All state persists across page reloads.

## Stack

- **Frontend**: Pure React — port **3000**
- **Backend**: Django — port **3001**
- **Database**: MySQL at port **3306**, schema named `elections`

## Application Structure

Three top-level views compose the entire app:

- `/` — Home page with a button to create a new election and a field to enter an election code to vote
- `/elections/:code` — Organizer view for a specific election
- `/vote/:code` — Voter view for casting or updating a ballot

---

## Creating an Election

From the home page, an organizer fills in:

- An **election title** (non-empty)
- Between **3 and 8 candidate names** (each non-empty, all distinct)

On submission a new election is created in **Open** status. The organizer is redirected to the organizer view, where a **shareable election code** is prominently displayed. The code is a short, unique, human-readable string (e.g. `VOTE-4829`).

---

## Casting a Ballot

From the home page a voter enters an election code. If the code matches an open election, they are taken to the voter view.

The voter enters a **display name** (non-empty), then **ranks every candidate** in order of preference. The ranking UI allows reordering via drag-and-drop or up/down controls. Position 1 is the most preferred. **All candidates must be ranked — partial ballots are not allowed.**

On submission the ballot is recorded. If the voter submits again using the same display name within the same election, their previous ballot is silently replaced with the new ranking.

Voting is **locked** once the election is closed. Any attempt to submit a ballot (new or replacement) against a closed election must be rejected with a visible error message.

---

## Organizer View (`/elections/:code`)

Displays:

- Election title and code
- Current status (Open / Closed)
- List of candidates
- **Preliminary results** panel (while the election is open) showing the current IRV computation, updated in real time as ballots arrive — use polling or WebSockets
- A **"Close Election"** button (only while Open)
- Full **results panel** once the election is closed

A **"Delete All Elections"** button is available on this page (and/or the home page). Clicking it permanently deletes every election, candidate, and ballot in the database and returns the UI to a clean state.

---

## Instant Runoff Voting Algorithm

When results are requested (for preliminary display or after closing), run the following algorithm against the current set of ballots:

1. Count first-choice votes among all non-eliminated candidates for each active (non-exhausted) ballot.
2. If any candidate holds **strictly more than 50%** of active ballot votes, that candidate **wins**. Stop.
3. Otherwise, identify the candidate(s) with the fewest first-choice votes.
   - **Tiebreaker**: if multiple candidates tie for fewest, compare their vote counts from the previous round. The one with fewer votes in the prior round is eliminated. If still tied (or it is round 1 with no prior round), eliminate the candidate whose name comes **last alphabetically**.
4. Remove the eliminated candidate from all ballots.
5. Any ballot whose remaining ranked candidates have all been eliminated becomes **exhausted** and is excluded from the active count going forward.
6. Repeat from step 1.

Produce a round-by-round record capturing, for each round: the vote count per candidate (only non-eliminated candidates), the name of the eliminated candidate (if any), and the number of exhausted ballots.

---

## Results Display

Visible after the election is closed inside `data-testid="results-panel"`.

- The **winner** is shown prominently — `data-testid="winner"` — containing the winning candidate's name.
- A **round-by-round table** follows. Each row represents one IRV round:
  - Row element carries `data-testid="round-{n}"` (1-indexed, e.g. `round-1`, `round-2`).
  - Each candidate's vote count for that round appears in its own cell.
  - The eliminated candidate for that round is visually marked (e.g. strikethrough, badge, or distinct color).
  - The count of exhausted ballots for that round is shown.

The same layout is used for the **preliminary results** panel while the election is open, reflecting the live state of ballots received so far.

---

## Page Persistence

All elections, candidates, and ballots must survive a full backend restart. On any page reload, the UI must restore to the exact state it was in before.

---

## `data-testid` Reference

Every interactive and observable element must carry the exact `data-testid` listed below.

### Home Page

- `election-title-input` — text field for the new election's title
- `candidate-input-{n}` — candidate name field, 0-indexed (e.g. `candidate-input-0`, `candidate-input-1`, …)
- `add-candidate-btn` — button to add another candidate field (up to 8)
- `remove-candidate-btn-{n}` — button to remove candidate field at index n
- `create-election-btn` — submits the new election form
- `election-code-input` — text field to enter an election code to go vote
- `go-vote-btn` — navigates to the voter view for the entered code
- `delete-all-btn` — destroys all elections, candidates, and ballots

### Organizer View (`/elections/:code`)

- `election-title` — displays the election title
- `election-code` — displays the shareable election code
- `election-status` — displays `Open` or `Closed`
- `close-election-btn` — closes the election (only present while Open)
- `preliminary-results` — container for live IRV results while Open
- `results-panel` — container for final results after Closed
- `winner` — the winning candidate's name (inside `results-panel`)
- `round-{n}` — each round row in the results table (1-indexed)
- `delete-all-btn` — same behavior as on the home page

### Voter View (`/vote/:code`)

- `voter-name-input` — text field for the voter's display name
- `candidate-ranking-list` — the ordered list of candidates to rank
- `candidate-item-{candidateName}` — individual draggable/reorderable item for each candidate (use the candidate's name, spaces replaced with hyphens, lowercased, e.g. `candidate-item-alice`)
- `move-up-btn-{candidateName}` — button to move a candidate up one position
- `move-down-btn-{candidateName}` — button to move a candidate down one position
- `submit-ballot-btn` — submits the ranking
- `ballot-error` — error message shown when ballot submission fails (e.g. voting on closed election)
- `ballot-success` — confirmation message shown on successful ballot submission
