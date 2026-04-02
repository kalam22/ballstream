package handlers

import (
	"football-stream/models"
)

var fetchMatchDetailFunc = fetchMatchDetail



func matchDetailViewFromMatch(match models.Match) models.MatchDetailView {
	return models.MatchDetailView{
		ID:        match.ID,
		HomeTeam:  match.HomeTeam,
		AwayTeam:  match.AwayTeam,
		HomeScore: match.HomeScore,
		AwayScore: match.AwayScore,
		Status:    match.Status,
		StartTime: match.StartTime,
		League:    match.League,
	}
}

func mergeMatchDetail(base, detail models.MatchDetailView) models.MatchDetailView {
	detail.ID = base.ID
	detail.HomeTeam = base.HomeTeam
	detail.AwayTeam = base.AwayTeam
	detail.HomeScore = base.HomeScore
	detail.AwayScore = base.AwayScore
	detail.Status = base.Status
	detail.StartTime = base.StartTime
	detail.League = base.League
	return detail
}
