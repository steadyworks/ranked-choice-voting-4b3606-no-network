from django.urls import re_path
from . import views

urlpatterns = [
    # Delete-all endpoints (must come before parameterized routes)
    re_path(r'^elections/all/?$', views.delete_all),
    re_path(r'^elections/delete-all/?$', views.delete_all),

    # Elections list + create
    re_path(r'^elections/?$', views.elections_list),

    # Ballot submission
    re_path(r'^elections/(?P<code>[^/]+)/ballots/?$', views.submit_ballot),
    re_path(r'^elections/(?P<code>[^/]+)/vote/?$', views.submit_ballot),

    # Close election
    re_path(r'^elections/(?P<code>[^/]+)/close/?$', views.close_election),

    # Results
    re_path(r'^elections/(?P<code>[^/]+)/results/?$', views.get_results),

    # Election detail (GET, PATCH, PUT, POST for closing)
    re_path(r'^elections/(?P<code>[^/]+)/?$', views.election_detail),
]
