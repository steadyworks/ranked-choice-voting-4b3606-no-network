"""
Instant Runoff Voting algorithm.
"""


def compute_irv(ballots, candidates):
    """
    Run the IRV algorithm.

    Args:
        ballots: list of lists of candidate names (each ballot ranked by preference)
        candidates: list of all candidate names

    Returns:
        {
            'winner': 'Name' or None,
            'rounds': [
                {
                    'round': 1,
                    'votes': {'A': 3, 'B': 2, 'C': 1},
                    'eliminated': 'C' or None,
                    'exhausted': 0
                },
                ...
            ]
        }
    """
    if not ballots:
        return {'winner': None, 'rounds': []}

    active_candidates = set(candidates)
    rounds = []
    prev_votes = None

    while active_candidates:
        # Count first-choice votes for each active candidate
        vote_counts = {c: 0 for c in active_candidates}
        exhausted = 0

        for ballot in ballots:
            voted = False
            for choice in ballot:
                if choice in active_candidates:
                    vote_counts[choice] += 1
                    voted = True
                    break
            if not voted:
                exhausted += 1

        total_active_votes = sum(vote_counts.values())

        # Handle case where all votes are exhausted
        if total_active_votes == 0:
            rounds.append({
                'round': len(rounds) + 1,
                'votes': dict(vote_counts),
                'eliminated': None,
                'exhausted': exhausted,
            })
            return {'winner': None, 'rounds': rounds}

        # Check for majority winner (strictly more than 50%)
        winner = None
        for candidate, votes in vote_counts.items():
            if votes * 2 > total_active_votes:
                winner = candidate
                break

        round_info = {
            'round': len(rounds) + 1,
            'votes': dict(vote_counts),
            'eliminated': None,
            'exhausted': exhausted,
        }

        if winner:
            rounds.append(round_info)
            return {'winner': winner, 'rounds': rounds}

        # Only one candidate left — they win
        if len(active_candidates) == 1:
            rounds.append(round_info)
            return {'winner': list(active_candidates)[0], 'rounds': rounds}

        # Find candidate(s) with fewest first-choice votes
        min_votes = min(vote_counts.values())
        min_candidates = sorted(
            [c for c, v in vote_counts.items() if v == min_votes]
        )

        if len(min_candidates) == 1:
            eliminated = min_candidates[0]
        else:
            # Tiebreaker 1: compare with previous round votes
            if prev_votes is not None:
                prev_counts = {c: prev_votes.get(c, 0) for c in min_candidates}
                prev_min = min(prev_counts.values())
                prev_min_cands = sorted(
                    [c for c, v in prev_counts.items() if v == prev_min]
                )
                if len(prev_min_cands) == 1:
                    eliminated = prev_min_cands[0]
                else:
                    # Still tied: eliminate last alphabetically
                    eliminated = max(prev_min_cands)
            else:
                # Round 1 with no prior data: eliminate last alphabetically
                eliminated = max(min_candidates)

        round_info['eliminated'] = eliminated
        rounds.append(round_info)

        active_candidates.remove(eliminated)
        prev_votes = dict(vote_counts)

    return {'winner': None, 'rounds': rounds}
