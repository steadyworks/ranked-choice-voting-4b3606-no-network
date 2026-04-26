import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction

from .models import Election, Candidate, Ballot
from .irv import compute_irv


def election_to_dict(election, include_results=False):
    candidates = list(election.candidates.values_list('name', flat=True).order_by('order', 'id'))
    data = {
        'id': election.id,
        'title': election.title,
        'code': election.code,
        'status': election.status,
        'candidates': candidates,
    }
    if include_results:
        ballots = list(election.ballots.values_list('ranking', flat=True))
        result = compute_irv(ballots, candidates)
        data['winner'] = result['winner']
        data['rounds'] = result['rounds']
    return data


@csrf_exempt
def elections_list(request):
    if request.method == 'GET':
        elections = Election.objects.all().order_by('-created_at')
        return JsonResponse([election_to_dict(e) for e in elections], safe=False)

    elif request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        title = (body.get('title') or '').strip()
        candidates = body.get('candidates', [])

        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)

        # Validate candidates
        candidate_names = [str(c).strip() for c in candidates if str(c).strip()]
        if len(candidate_names) < 3:
            return JsonResponse({'error': 'At least 3 candidates required'}, status=400)
        if len(candidate_names) > 8:
            return JsonResponse({'error': 'At most 8 candidates allowed'}, status=400)
        if len(set(candidate_names)) != len(candidate_names):
            return JsonResponse({'error': 'Candidate names must be distinct'}, status=400)

        with transaction.atomic():
            election = Election.objects.create(
                title=title,
                code=Election.generate_code(),
                status='open',
            )
            for i, name in enumerate(candidate_names):
                Candidate.objects.create(election=election, name=name, order=i)

        return JsonResponse(election_to_dict(election), status=201)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def election_detail(request, code):
    try:
        election = Election.objects.get(code=code)
    except Election.DoesNotExist:
        return JsonResponse({'error': 'Election not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse(election_to_dict(election, include_results=True))

    elif request.method in ('PATCH', 'PUT', 'POST'):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            body = {}

        status = (body.get('status') or '').lower()
        if status == 'closed':
            election.status = 'closed'
            election.save()
            return JsonResponse({'success': True, 'status': 'closed'})

        return JsonResponse({'error': 'Invalid request'}, status=400)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def close_election(request, code):
    try:
        election = Election.objects.get(code=code)
    except Election.DoesNotExist:
        return JsonResponse({'error': 'Election not found'}, status=404)

    if request.method in ('POST', 'PATCH', 'PUT'):
        election.status = 'closed'
        election.save()
        return JsonResponse({'success': True, 'status': 'closed'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def submit_ballot(request, code):
    try:
        election = Election.objects.get(code=code)
    except Election.DoesNotExist:
        return JsonResponse({'error': 'Election not found'}, status=404)

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if election.status != 'open':
        return JsonResponse({'error': 'Election is closed'}, status=400)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    voter_name = (body.get('voter_name') or '').strip()
    ranking = body.get('ranking', [])

    if not voter_name:
        return JsonResponse({'error': 'Voter name is required'}, status=400)

    # Validate ranking contains all candidates
    candidate_names = set(
        election.candidates.values_list('name', flat=True)
    )
    ranking_set = set(ranking)
    if ranking_set != candidate_names:
        return JsonResponse(
            {'error': 'Ranking must include all candidates exactly once'},
            status=400,
        )

    # Upsert ballot (replace if same voter_name in same election)
    Ballot.objects.update_or_create(
        election=election,
        voter_name=voter_name,
        defaults={'ranking': list(ranking)},
    )

    return JsonResponse({'success': True}, status=201)


@csrf_exempt
def get_results(request, code):
    try:
        election = Election.objects.get(code=code)
    except Election.DoesNotExist:
        return JsonResponse({'error': 'Election not found'}, status=404)

    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    candidates = list(
        election.candidates.values_list('name', flat=True).order_by('order', 'id')
    )
    ballots = list(election.ballots.values_list('ranking', flat=True))
    result = compute_irv(ballots, candidates)

    return JsonResponse({
        'winner': result['winner'],
        'rounds': result['rounds'],
    })


@csrf_exempt
def delete_all(request):
    if request.method in ('DELETE', 'POST', 'GET'):
        Election.objects.all().delete()
        return JsonResponse({'deleted': True})

    return JsonResponse({'error': 'Method not allowed'}, status=405)
