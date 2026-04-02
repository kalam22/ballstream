package handlers

import (
	"encoding/json"
	"football-stream/models"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type bootstrapRefreshConfig struct {
	MatchesSeconds int `json:"matches_seconds"`
	AccountSeconds int `json:"account_seconds"`
	SportsSeconds  int `json:"sports_seconds"`
}

type bootstrapResponse struct {
	Account models.AccountInfo     `json:"account"`
	Sports  []models.Sport         `json:"sports"`
	Refresh bootstrapRefreshConfig `json:"refresh"`
}

// writeJSON is a DRY helper that writes a JSON response with correct headers.
func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[Handler Error] Failed to encode JSON: %v", err)
	}
}

// APIProxy serves the current cached match list with pagination support.
func APIProxy(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=30")
	
	// Get pagination parameters
	page := GetIntParam(r, "page", 1)
	limit := GetIntParam(r, "limit", 300)
	
	// Validate pagination parameters
	if page < 1 {
		WriteError(w, http.StatusBadRequest, ErrInvalidPagination, "Page must be >= 1")
		return
	}
	if limit < 1 || limit > 500 {
		WriteError(w, http.StatusBadRequest, ErrInvalidPagination, "Limit must be between 1 and 500")
		return
	}
	
	matches := GetMatchesFromCache()
	if matches == nil {
		RecordCacheMiss("matches")
		matches = []models.Match{}
	} else {
		RecordCacheHit("matches")
	}
	
	total := len(matches)
	start, end := CalculatePagination(total, page, limit)
	
	// Return paginated response
	WriteSuccessWithMeta(w, matches[start:end], &Meta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: CalculateTotalPages(total, limit),
	})
}

// GetAccount serves the current cached account info.
func GetAccount(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=60")
	account := GetAccountFromCache()
	if account.Plan == "" && account.DailyLimit == 0 && account.UsageToday == 0 {
		RecordCacheMiss("account")
	} else {
		RecordCacheHit("account")
	}
	WriteSuccess(w, account)
}

// GetSports serves the current cached sports list.
func GetSports(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=300")
	sports := GetSportsFromCache()
	if sports == nil {
		RecordCacheMiss("sports")
		sports = []models.Sport{}
	} else {
		RecordCacheHit("sports")
	}
	WriteSuccess(w, sports)
}

// GetBootstrap serves lightweight bootstrap data for the initial page load.
func GetBootstrap(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=60")

	sports := GetSportsFromCache()
	if sports == nil {
		RecordCacheMiss("sports")
		sports = []models.Sport{}
	} else {
		RecordCacheHit("sports")
	}
	account := GetAccountFromCache()
	if account.Plan == "" && account.DailyLimit == 0 && account.UsageToday == 0 {
		RecordCacheMiss("account")
	} else {
		RecordCacheHit("account")
	}

	WriteSuccess(w, bootstrapResponse{
		Account: account,
		Sports:  sports,
		Refresh: bootstrapRefreshConfig{
			MatchesSeconds: int(MatchesRefreshInterval / time.Second),
			AccountSeconds: int(AccountRefreshInterval / time.Second),
			SportsSeconds:  int(SportsRefreshInterval / time.Second),
		},
	})
}

// GetUpstreams exposes round-robin upstream health and usage counters.
func GetUpstreams(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	WriteSuccess(w, GetUpstreamHealth())
}

// matchDetailJSON is the JSON served to the React SPA (snake_case).
type matchDetailJSON struct {
	ID       string `json:"id"`
	HomeTeam struct {
		Name string `json:"name"`
		Logo string `json:"logo"`
	} `json:"home_team"`
	AwayTeam struct {
		Name string `json:"name"`
		Logo string `json:"logo"`
	} `json:"away_team"`
	HomeScore          int    `json:"home_score"`
	AwayScore          int    `json:"away_score"`
	Status             string `json:"status"`
	StartTime          string `json:"start_time"`
	League             string `json:"league"`
	StatusDetail       string `json:"status_detail,omitempty"`
	LeagueSeason       string `json:"league_season,omitempty"`
	LeagueRound        string `json:"league_round,omitempty"`
	LeagueCountry      string `json:"league_country,omitempty"`
	LeagueFlag         string `json:"league_flag,omitempty"`
	LeagueLogo         string `json:"league_logo,omitempty"`
	HomeColor          string `json:"home_color,omitempty"`
	AwayColor          string `json:"away_color,omitempty"`
	HomeCode           string `json:"home_code,omitempty"`
	AwayCode           string `json:"away_code,omitempty"`
	ScorePeriod1       string `json:"score_period1,omitempty"`
	ScorePeriod2       string `json:"score_period2,omitempty"`
	ScorePeriod3       string `json:"score_period3,omitempty"`
	ScorePeriod4       string `json:"score_period4,omitempty"`
	ScorePenalty       string `json:"score_penalty,omitempty"`
	InjuryTime1        string `json:"injury_time1,omitempty"`
	InjuryTime2        string `json:"injury_time2,omitempty"`
	Sources            []struct {
		StreamNo int    `json:"stream_no"`
		EmbedURL string `json:"embed_url"`
		Source   string `json:"source,omitempty"`
		HD       bool   `json:"hd"`
		Language string `json:"language,omitempty"`
	} `json:"sources"`
	VenueStadium       string `json:"venue_stadium,omitempty"`
	VenueCity          string `json:"venue_city,omitempty"`
	VenueCountry       string `json:"venue_country,omitempty"`
	VenueImage         string `json:"venue_image,omitempty"`
	VenueCapacity      int    `json:"venue_capacity,omitempty"`
	RefereeName        string `json:"referee_name,omitempty"`
	RefereeCountry     string `json:"referee_country,omitempty"`
	RefereePhoto       string `json:"referee_photo,omitempty"`
	RefereeGames       int    `json:"referee_games,omitempty"`
	RefereeYellow      int    `json:"referee_yellow,omitempty"`
	RefereeRed         int    `json:"referee_red,omitempty"`
	ManagerHomeName    string `json:"manager_home_name,omitempty"`
	ManagerHomeCountry string `json:"manager_home_country,omitempty"`
	ManagerHomePhoto   string `json:"manager_home_photo,omitempty"`
	ManagerAwayName    string `json:"manager_away_name,omitempty"`
	ManagerAwayCountry string `json:"manager_away_country,omitempty"`
	ManagerAwayPhoto   string `json:"manager_away_photo,omitempty"`
	DetailUnavailable  bool   `json:"detail_unavailable,omitempty"`
	DetailMessage      string `json:"detail_message,omitempty"`
}


var matchIDPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,64}$`)

// GetMatchDetail serves match detail as JSON for the React SPA.
// Route: /api/match/:id or /api/v1/match/:id
func GetMatchDetail(w http.ResponseWriter, r *http.Request) {
	// Extract ID from path (works for both /api/match/ and /api/v1/match/)
	path := r.URL.Path
	var id string
	switch {
	case strings.HasPrefix(path, "/api/v1/match/"):
		id = strings.TrimSuffix(path[len("/api/v1/match/"):], "/")
	case strings.HasPrefix(path, "/api/match/"):
		id = strings.TrimSuffix(path[len("/api/match/"):], "/")
	}

	// Validate match ID format to prevent injection attacks
	if id == "" || !matchIDPattern.MatchString(id) {
		log.Printf("[GetMatchDetail] Invalid match ID: '%s' (length: %d)", id, len(id))
		WriteError(w, http.StatusBadRequest, ErrInvalidMatchID, "Invalid match ID format")
		return
	}

	match, found := GetMatchByID(id)
	if !found {
		WriteError(w, http.StatusNotFound, ErrMatchNotFound, "Match not found")
		return
	}

	// Check cache first (30s TTL)
	if cached, ok := GetMatchDetailCache(id); ok {
		resp := matchDetailJSON{
			HomeScore:          cached.HomeScore,
			AwayScore:          cached.AwayScore,
			Status:             cached.Status,
			StartTime:          cached.StartTime,
			League:             cached.League,
			StatusDetail:       cached.StatusDetail,
			LeagueSeason:       cached.LeagueSeason,
			LeagueRound:        cached.LeagueRound,
			LeagueCountry:      cached.LeagueCountry,
			LeagueFlag:         cached.LeagueFlag,
			LeagueLogo:         cached.LeagueLogo,
			HomeColor:          cached.HomeColor,
			AwayColor:          cached.AwayColor,
			HomeCode:           cached.HomeCode,
			AwayCode:           cached.AwayCode,
			ScorePeriod1:       cached.ScorePeriod1,
			ScorePeriod2:       cached.ScorePeriod2,
			ScorePeriod3:       cached.ScorePeriod3,
			ScorePeriod4:       cached.ScorePeriod4,
			ScorePenalty:       cached.ScorePenalty,
			InjuryTime1:        cached.InjuryTime1,
			InjuryTime2:        cached.InjuryTime2,
			VenueStadium:       cached.VenueStadium,
			VenueCity:          cached.VenueCity,
			VenueCountry:       cached.VenueCountry,
			VenueImage:         cached.VenueImage,
			VenueCapacity:      cached.VenueCapacity,
			RefereeName:        cached.RefereeName,
			RefereeCountry:     cached.RefereeCountry,
			RefereePhoto:       cached.RefereePhoto,
			RefereeGames:       cached.RefereeGames,
			RefereeYellow:      cached.RefereeYellow,
			RefereeRed:         cached.RefereeRed,
			ManagerHomeName:    cached.ManagerHomeName,
			ManagerHomeCountry: cached.ManagerHomeCountry,
			ManagerHomePhoto:   cached.ManagerHomePhoto,
			ManagerAwayName:    cached.ManagerAwayName,
			ManagerAwayCountry: cached.ManagerAwayCountry,
			ManagerAwayPhoto:   cached.ManagerAwayPhoto,
			DetailUnavailable:  cached.DetailUnavailable,
			DetailMessage:      cached.DetailMessage,
		}
		resp.ID = cached.ID
		resp.HomeTeam.Name = cached.HomeTeam.Name
		resp.HomeTeam.Logo = cached.HomeTeam.Logo
		resp.AwayTeam.Name = cached.AwayTeam.Name
		resp.AwayTeam.Logo = cached.AwayTeam.Logo
		for _, s := range cached.Sources {
			resp.Sources = append(resp.Sources, struct {
				StreamNo int    `json:"stream_no"`
				EmbedURL string `json:"embed_url"`
				Source   string `json:"source,omitempty"`
				HD       bool   `json:"hd"`
				Language string `json:"language,omitempty"`
			}{StreamNo: s.StreamNo, EmbedURL: s.EmbedURL, Source: s.Source, HD: s.HD, Language: s.Language})
		}

		w.Header().Set("Cache-Control", "public, max-age=30")
		w.Header().Set("X-Cache", "HIT")
		WriteSuccess(w, resp)
		return
	}
	
	view := matchDetailViewFromMatch(match)

	// Fetch fresh data from API
	detail, err := fetchMatchDetailFunc(id)
	if err != nil {
		log.Printf("[GetMatchDetail] Fetch error for %s: %v", id, err)
		// Return basic data if fetch fails
		view.DetailUnavailable = true
		view.DetailMessage = "Detail tambahan tidak tersedia saat ini."
	} else {
		// Merge fresh data immediately
		view = mergeMatchDetail(view, detail)
		// Store in cache for 30 seconds
		SetMatchDetailCache(id, view)
	}

	resp := matchDetailJSON{
		HomeScore:          view.HomeScore,
		AwayScore:          view.AwayScore,
		Status:             view.Status,
		StartTime:          view.StartTime,
		League:             view.League,
		StatusDetail:       view.StatusDetail,
		LeagueSeason:       view.LeagueSeason,
		LeagueRound:        view.LeagueRound,
		LeagueCountry:      view.LeagueCountry,
		LeagueFlag:         view.LeagueFlag,
		LeagueLogo:         view.LeagueLogo,
		HomeColor:          view.HomeColor,
		AwayColor:          view.AwayColor,
		HomeCode:           view.HomeCode,
		AwayCode:           view.AwayCode,
		ScorePeriod1:       view.ScorePeriod1,
		ScorePeriod2:       view.ScorePeriod2,
		ScorePeriod3:       view.ScorePeriod3,
		ScorePeriod4:       view.ScorePeriod4,
		ScorePenalty:       view.ScorePenalty,
		InjuryTime1:        view.InjuryTime1,
		InjuryTime2:        view.InjuryTime2,
		VenueStadium:       view.VenueStadium,
		VenueCity:          view.VenueCity,
		VenueCountry:       view.VenueCountry,
		VenueImage:         view.VenueImage,
		VenueCapacity:      view.VenueCapacity,
		RefereeName:        view.RefereeName,
		RefereeCountry:     view.RefereeCountry,
		RefereePhoto:       view.RefereePhoto,
		RefereeGames:       view.RefereeGames,
		RefereeYellow:      view.RefereeYellow,
		RefereeRed:         view.RefereeRed,
		ManagerHomeName:    view.ManagerHomeName,
		ManagerHomeCountry: view.ManagerHomeCountry,
		ManagerHomePhoto:   view.ManagerHomePhoto,
		ManagerAwayName:    view.ManagerAwayName,
		ManagerAwayCountry: view.ManagerAwayCountry,
		ManagerAwayPhoto:   view.ManagerAwayPhoto,
		DetailUnavailable:  view.DetailUnavailable,
		DetailMessage:      view.DetailMessage,
	}
	resp.ID = view.ID
	resp.HomeTeam.Name = view.HomeTeam.Name
	resp.HomeTeam.Logo = view.HomeTeam.Logo
	resp.AwayTeam.Name = view.AwayTeam.Name
	resp.AwayTeam.Logo = view.AwayTeam.Logo
	for _, s := range view.Sources {
		resp.Sources = append(resp.Sources, struct {
			StreamNo int    `json:"stream_no"`
			EmbedURL string `json:"embed_url"`
			Source   string `json:"source,omitempty"`
			HD       bool   `json:"hd"`
			Language string `json:"language,omitempty"`
		}{StreamNo: s.StreamNo, EmbedURL: s.EmbedURL, Source: s.Source, HD: s.HD, Language: s.Language})
	}

	w.Header().Set("Cache-Control", "public, max-age=30")
	w.Header().Set("X-Cache", "MISS")
	WriteSuccess(w, resp)
}
