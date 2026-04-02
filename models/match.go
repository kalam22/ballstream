package models

type Match struct {
	ID        string `json:"id"`
	HomeTeam  Team   `json:"home_team"`
	AwayTeam  Team   `json:"away_team"`
	HomeScore int    `json:"home_score"`
	AwayScore int    `json:"away_score"`
	Status    string `json:"status"` // "live", "upcoming", "finished"
	StartTime string `json:"start_time"`
	League    string `json:"league"`
	StreamURL string `json:"stream_url"`
}

type Team struct {
	Name string `json:"name"`
	Logo string `json:"logo"`
}

type AccountInfo struct {
	Plan        string `json:"plan"`
	DailyLimit  int    `json:"daily_limit"`
	UsageToday  int    `json:"usage_today"`
	ResetAt     string `json:"reset_at"`
	SourceCount int    `json:"source_count,omitempty"`
	Partial     bool   `json:"partial,omitempty"`
}

type Sport struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon"`
}

type UpstreamHealth struct {
	Name                string `json:"name"`
	BaseURL             string `json:"base_url"`
	TotalRequests       int64  `json:"total_requests"`
	Successes           int64  `json:"successes"`
	Failures            int64  `json:"failures"`
	ConsecutiveFailures int64  `json:"consecutive_failures"`
	LastStatusCode      int    `json:"last_status_code"`
	LastError           string `json:"last_error,omitempty"`
	LastUsedAt          string `json:"last_used_at,omitempty"`
	LastSuccessAt       string `json:"last_success_at,omitempty"`
	CircuitState        string `json:"circuit_state"`
	OpenUntil           string `json:"open_until,omitempty"`
}

// -------------------------------------------------------------------
// API Structures to parse response from sportsrc.org
// -------------------------------------------------------------------

type APIResponse struct {
	Success bool        `json:"success"`
	Data    []APILeague `json:"data"`
}

type APILeague struct {
	League struct {
		Name string `json:"name"`
	} `json:"league"`
	Matches []APIMatch `json:"matches"`
}

type APIMatch struct {
	ID        string `json:"id"`
	Timestamp int64  `json:"timestamp"`
	Status    string `json:"status"`
	Teams     struct {
		Home APITeam `json:"home"`
		Away APITeam `json:"away"`
	} `json:"teams"`
	Score struct {
		Current struct {
			Home int `json:"home"`
			Away int `json:"away"`
		} `json:"current"`
	} `json:"score"`
}

type APITeam struct {
	Name  string `json:"name"`
	Badge string `json:"badge"`
	Code  string `json:"code"`
	Color string `json:"color"`
}

type APIAccountResponse struct {
	Success bool        `json:"success"`
	Data    AccountInfo `json:"data"`
}

type APISportsResponse struct {
	Success bool    `json:"success"`
	Data    []Sport `json:"data"`
}

// -------------------------------------------------------------------
// Detail endpoint structures
// -------------------------------------------------------------------

// APIDetailSource is a single stream source from the detail endpoint.
type APIDetailSource struct {
	ID       string `json:"id"`
	StreamNo int    `json:"streamNo"`
	EmbedURL string `json:"embedUrl"`
	Source   string `json:"source"`
	HD       bool   `json:"hd"`
	Language string `json:"language"`
}

// APIDetailData is the full data object from type=detail.
type APIDetailData struct {
	MatchInfo struct {
		ID           string `json:"id"`
		Title        string `json:"title"`
		Status       string `json:"status"`
		StatusDetail string `json:"status_detail"`
		Timestamp    int64  `json:"timestamp"`
		League       struct {
			Name    string `json:"name"`
			Season  string `json:"season"`
			Round   string `json:"round"`
			Country string `json:"country"`
			Flag    string `json:"flag"`
			Logo    string `json:"logo"`
		} `json:"league"`
		Teams struct {
			Home APITeam `json:"home"`
			Away APITeam `json:"away"`
		} `json:"teams"`
		Score struct {
			Current struct {
				Home int `json:"home"`
				Away int `json:"away"`
			} `json:"current"`
			Period1    interface{} `json:"period_1"`
			Period2    interface{} `json:"period_2"`
			Period3    interface{} `json:"period_3"`
			Period4    interface{} `json:"period_4"`
			Penalties  interface{} `json:"penalties"`
			NormalTime interface{} `json:"normal_time"`
			Display    string      `json:"display"`
		} `json:"score"`
		TimeInfo struct {
			InjuryTime1 string `json:"injury_time_1"`
			InjuryTime2 string `json:"injury_time_2"`
			PeriodStart int64  `json:"period_start"`
		} `json:"time_info"`
	} `json:"match_info"`
	Sources []APIDetailSource `json:"sources"`
	Info    struct {
		Venue struct {
			Stadium     string `json:"stadium"`
			City        string `json:"city"`
			Country     string `json:"country"`
			Image       string `json:"image"`
			Capacity    int    `json:"capacity"`
			Coordinates struct {
				Lat float64 `json:"lat"`
				Lng float64 `json:"lng"`
			} `json:"coordinates"`
		} `json:"venue"`
		Referee struct {
			Name          string `json:"name"`
			Country       string `json:"country"`
			Photo         string `json:"photo"`
			GamesRecorded int    `json:"games_recorded"`
			YellowCards   int    `json:"yellow_cards"`
			RedCards      int    `json:"red_cards"`
			YellowRed     int    `json:"yellow_red_cards"`
		} `json:"referee"`
		Managers struct {
			Home struct {
				Name    string `json:"name"`
				Country string `json:"country"`
				Photo   string `json:"photo"`
			} `json:"home"`
			Away struct {
				Name    string `json:"name"`
				Country string `json:"country"`
				Photo   string `json:"photo"`
			} `json:"away"`
		} `json:"managers"`
	} `json:"info"`
}

// APIDetailResponse is the top-level response shape from type=detail.
type APIDetailResponse struct {
	Success bool          `json:"success"`
	Data    APIDetailData `json:"data"`
}

// -------------------------------------------------------------------
// MatchDetailView is the struct passed to the match.html template.
// It combines cached match data with live detail from the API.
// -------------------------------------------------------------------

type StreamSource struct {
	StreamNo int
	EmbedURL string
	Source   string
	HD       bool
	Language string
}

type MatchDetailView struct {
	// Base match info (from cache)
	ID        string
	HomeTeam  Team
	AwayTeam  Team
	HomeScore int
	AwayScore int
	Status    string
	StartTime string
	League    string

	// Detail info (from detail API)
	StatusDetail  string
	LeagueSeason  string
	LeagueRound   string
	LeagueCountry string
	LeagueFlag    string
	LeagueLogo    string
	HomeColor     string
	AwayColor     string
	HomeCode      string
	AwayCode      string
	ScoreDisplay  string
	ScorePeriod1  string
	ScorePeriod2  string
	ScorePeriod3  string
	ScorePeriod4  string
	ScorePenalty  string
	InjuryTime1   string
	InjuryTime2   string

	Sources []StreamSource

	VenueStadium  string
	VenueCity     string
	VenueCountry  string
	VenueImage    string
	VenueCapacity int

	RefereeName    string
	RefereeCountry string
	RefereePhoto   string
	RefereeGames   int
	RefereeYellow  int
	RefereeRed     int

	ManagerHomeName    string
	ManagerHomeCountry string
	ManagerHomePhoto   string
	ManagerAwayName    string
	ManagerAwayCountry string
	ManagerAwayPhoto   string

	DetailUnavailable bool
	DetailMessage     string
}
