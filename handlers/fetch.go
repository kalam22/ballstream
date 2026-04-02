package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"football-stream/models"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// httpClient is a shared, reusable HTTP client to avoid TCP overhead per request.
var httpClient = &http.Client{Timeout: 10 * time.Second}

var (
	errInvalidAPIBaseURL = errors.New("API_BASE_URL must be a valid https URL")
	errMissingAPIKey     = errors.New("API_KEY is not configured")
)

const (
	upstreamCircuitFailureThreshold = 3
	upstreamCircuitCooldown         = 1 * time.Minute
)

type upstreamConfig struct {
	BaseURL string
	APIKey  string
	Name    string
}

type upstreamStats struct {
	mu                  sync.Mutex
	TotalRequests       int64
	Successes           int64
	Failures            int64
	ConsecutiveFailures int64
	LastStatusCode      int
	LastError           string
	LastUsedAt          time.Time
	LastSuccessAt       time.Time
	OpenUntil           time.Time
}

var upstreamCounter uint64
var upstreamStatsStore sync.Map
var (
	upstreamLimiterMu  sync.Mutex
	upstreamLimiter    chan struct{}
	upstreamLimiterCap int
)

func normalizeHTTPSURL(raw string) (string, bool) {
	if raw == "" {
		return "", false
	}

	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return "", false
	}

	return parsed.String(), true
}

func isAllowedStreamHost(host string) bool {
	allowlist := strings.TrimSpace(os.Getenv("STREAM_EMBED_ALLOWLIST"))
	if allowlist == "" {
		return true
	}

	host = strings.ToLower(host)
	for _, entry := range strings.Split(allowlist, ",") {
		entry = strings.ToLower(strings.TrimSpace(entry))
		if entry == "" {
			continue
		}
		if host == entry || strings.HasSuffix(host, "."+entry) {
			return true
		}
	}

	return false
}

func loadUpstreamConfigs() ([]upstreamConfig, error) {
	baseURL := os.Getenv("API_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.sportsrc.org/v2/"
	}
	safeBaseURL, ok := normalizeHTTPSURL(baseURL)
	if !ok {
		return nil, errInvalidAPIBaseURL
	}

	apiKey := strings.TrimSpace(os.Getenv("API_KEY"))
	if apiKey == "" || apiKey == "replace-with-real-api-key" {
		return nil, errMissingAPIKey
	}

	upstreams := []upstreamConfig{
		{
			BaseURL: safeBaseURL,
			APIKey:  apiKey,
			Name:    "primary",
		},
	}

	apiKey2 := strings.TrimSpace(os.Getenv("API_KEY_2"))
	if apiKey2 != "" && apiKey2 != "replace-with-real-api-key" {
		baseURL2 := os.Getenv("API_BASE_URL_2")
		if baseURL2 == "" {
			baseURL2 = safeBaseURL
		}
		safeBaseURL2, ok := normalizeHTTPSURL(baseURL2)
		if !ok {
			return nil, errors.New("API_BASE_URL_2 must be a valid https URL")
		}

		upstreams = append(upstreams, upstreamConfig{
			BaseURL: safeBaseURL2,
			APIKey:  apiKey2,
			Name:    "secondary",
		})
	}

	return upstreams, nil
}

func orderedUpstreams(upstreams []upstreamConfig) []upstreamConfig {
	available := make([]upstreamConfig, 0, len(upstreams))
	openCircuits := make([]upstreamConfig, 0, len(upstreams))
	now := time.Now().UTC()
	for _, upstream := range upstreams {
		if isUpstreamCircuitOpen(upstream.Name, now) {
			openCircuits = append(openCircuits, upstream)
			continue
		}
		available = append(available, upstream)
	}

	if len(available) == 0 {
		available = openCircuits
	}

	if len(available) <= 1 {
		return available
	}

	start := int(atomic.AddUint64(&upstreamCounter, 1)-1) % len(available)
	ordered := make([]upstreamConfig, 0, len(available))
	for i := 0; i < len(available); i++ {
		ordered = append(ordered, available[(start+i)%len(available)])
	}
	return ordered
}

func isUpstreamCircuitOpen(name string, now time.Time) bool {
	statsAny, ok := upstreamStatsStore.Load(name)
	if !ok {
		return false
	}
	stats := statsAny.(*upstreamStats)
	stats.mu.Lock()
	defer stats.mu.Unlock()
	return !stats.OpenUntil.IsZero() && stats.OpenUntil.After(now)
}

func recordUpstreamResultWithLatency(upstream upstreamConfig, statusCode int, err error, latency time.Duration) {
	statsAny, _ := upstreamStatsStore.LoadOrStore(upstream.Name, &upstreamStats{})
	stats := statsAny.(*upstreamStats)
	RecordUpstreamObservation(upstream.Name, statusCode, latency.Microseconds(), err)

	now := time.Now().UTC()
	stats.mu.Lock()
	defer stats.mu.Unlock()
	stats.TotalRequests++
	stats.LastStatusCode = statusCode
	stats.LastUsedAt = now
	if err != nil {
		stats.Failures++
		stats.ConsecutiveFailures++
		stats.LastError = err.Error()
		if stats.ConsecutiveFailures >= upstreamCircuitFailureThreshold {
			stats.OpenUntil = now.Add(upstreamCircuitCooldown)
		}
		return
	}

	stats.Successes++
	stats.ConsecutiveFailures = 0
	stats.LastError = ""
	stats.LastSuccessAt = now
	stats.OpenUntil = time.Time{}
}

func upstreamMaxInflight() int {
	raw := strings.TrimSpace(os.Getenv("UPSTREAM_MAX_INFLIGHT"))
	if raw == "" {
		return 8
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 {
		return 8
	}
	return value
}

func acquireUpstreamSlot(ctx context.Context) (func(), error) {
	capacity := upstreamMaxInflight()
	upstreamLimiterMu.Lock()
	if upstreamLimiter == nil || upstreamLimiterCap != capacity {
		upstreamLimiter = make(chan struct{}, capacity)
		upstreamLimiterCap = capacity
	}
	limiter := upstreamLimiter
	upstreamLimiterMu.Unlock()

	select {
	case limiter <- struct{}{}:
		return func() { <-limiter }, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func GetUpstreamHealth() []models.UpstreamHealth {
	upstreams, err := loadUpstreamConfigs()
	if err != nil {
		return nil
	}

	result := make([]models.UpstreamHealth, 0, len(upstreams))
	for _, upstream := range upstreams {
		health := models.UpstreamHealth{
			Name:    upstream.Name,
			BaseURL: upstream.BaseURL,
		}
		if statsAny, ok := upstreamStatsStore.Load(upstream.Name); ok {
			stats := statsAny.(*upstreamStats)
			stats.mu.Lock()
			health.TotalRequests = stats.TotalRequests
			health.Successes = stats.Successes
			health.Failures = stats.Failures
			health.ConsecutiveFailures = stats.ConsecutiveFailures
			health.LastStatusCode = stats.LastStatusCode
			health.LastError = stats.LastError
			if !stats.LastUsedAt.IsZero() {
				health.LastUsedAt = stats.LastUsedAt.Format(time.RFC3339)
			}
			if !stats.LastSuccessAt.IsZero() {
				health.LastSuccessAt = stats.LastSuccessAt.Format(time.RFC3339)
			}
			if !stats.OpenUntil.IsZero() {
				health.OpenUntil = stats.OpenUntil.Format(time.RFC3339)
			}
			if !stats.OpenUntil.IsZero() && stats.OpenUntil.After(time.Now().UTC()) {
				health.CircuitState = "open"
			} else {
				health.CircuitState = "closed"
			}
			stats.mu.Unlock()
		} else {
			health.CircuitState = "closed"
		}
		result = append(result, health)
	}
	return result
}

func doUpstreamRequest(ctx context.Context, upstream upstreamConfig, fullURL string) ([]byte, int, error) {
	release, err := acquireUpstreamSlot(ctx)
	if err != nil {
		recordUpstreamResultWithLatency(upstream, 0, err, 0)
		return nil, 0, err
	}
	defer release()

	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return nil, 0, err
	}

	req.Header.Set("X-API-KEY", upstream.APIKey)
	req.Header.Set("Accept", "application/json")

	start := time.Now()
	resp, doErr := httpClient.Do(req)

	statusCode := 0
	if resp != nil {
		statusCode = resp.StatusCode
	}
	log.Printf("[API:%s] GET %s ->> %d (%v)", upstream.Name, fullURL, statusCode, time.Since(start))
	latency := time.Since(start)

	if doErr != nil {
		recordUpstreamResultWithLatency(upstream, statusCode, doErr, latency)
		return nil, statusCode, doErr
	}

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		err := errors.New(resp.Status)
		resp.Body.Close()
		recordUpstreamResultWithLatency(upstream, resp.StatusCode, err, latency)
		return nil, resp.StatusCode, err
	}

	body, readErr := io.ReadAll(resp.Body)
	resp.Body.Close()
	if readErr != nil {
		recordUpstreamResultWithLatency(upstream, resp.StatusCode, readErr, latency)
		return nil, resp.StatusCode, readErr
	}

	recordUpstreamResultWithLatency(upstream, resp.StatusCode, nil, latency)
	return body, resp.StatusCode, nil
}

func parseResetWindow(raw string) (time.Duration, bool) {
	parts := strings.Split(strings.TrimSpace(raw), ":")
	if len(parts) != 3 {
		return 0, false
	}

	var hours, minutes, seconds int
	if _, err := fmt.Sscanf(raw, "%d:%d:%d", &hours, &minutes, &seconds); err != nil {
		return 0, false
	}
	return time.Duration(hours)*time.Hour + time.Duration(minutes)*time.Minute + time.Duration(seconds)*time.Second, true
}

func chooseSoonestReset(current, candidate string) string {
	if current == "" {
		return candidate
	}
	if candidate == "" {
		return current
	}

	currentDur, currentOK := parseResetWindow(current)
	candidateDur, candidateOK := parseResetWindow(candidate)
	if !currentOK || !candidateOK {
		return current
	}
	if candidateDur < currentDur {
		return candidate
	}
	return current
}

func aggregateAccounts(accounts []models.AccountInfo, activeSources int, partial bool) models.AccountInfo {
	result := models.AccountInfo{
		Plan:        "combined",
		SourceCount: len(accounts),
		Partial:     partial,
	}

	for _, account := range accounts {
		result.DailyLimit += account.DailyLimit
		result.UsageToday += account.UsageToday
		result.ResetAt = chooseSoonestReset(result.ResetAt, account.ResetAt)
		if account.Plan != "" && result.Plan == "combined" {
			result.Plan = account.Plan
		}
	}

	if len(accounts) == 0 {
		result.SourceCount = activeSources
	}

	return result
}

// fetchFromAPI performs a GET request to the sportsrc API for the given endpoint
// and optional extra query parameters.
func fetchFromAPI(endpoint string, params map[string]string) ([]byte, error) {
	return fetchFromAPIWithTimeout(context.Background(), endpoint, params, 10*time.Second)
}

func fetchFromAPIWithTimeout(parent context.Context, endpoint string, params map[string]string, timeout time.Duration) ([]byte, error) {
	q := url.Values{}
	q.Set("type", endpoint)
	for k, v := range params {
		if v != "" {
			q.Set(k, v)
		}
	}
	upstreams, err := loadUpstreamConfigs()
	if err != nil {
		return nil, err
	}

	ctx := parent
	var cancel context.CancelFunc
	if timeout > 0 {
		ctx, cancel = context.WithTimeout(parent, timeout)
		defer cancel()
	}

	var lastErr error
	for _, upstream := range orderedUpstreams(upstreams) {
		fullURL := upstream.BaseURL + "?" + q.Encode()
		body, _, reqErr := doUpstreamRequest(ctx, upstream, fullURL)
		if reqErr != nil {
			lastErr = reqErr
			continue
		}
		return body, nil
	}

	if lastErr == nil {
		lastErr = errors.New("all upstream API requests failed")
	}
	return nil, lastErr
}

// fetchMatches retrieves and parses matches from the API.
// Optional filters: sport (e.g. "football"), status (e.g. "inprogress"), date (YYYY-MM-DD).
func fetchMatches(sport, status, date string) ([]models.Match, error) {
	body, err := fetchFromAPI("matches", map[string]string{
		"sport":  sport,
		"status": status,
		"date":   date,
	})
	if err != nil {
		return nil, err
	}

	var apiResp models.APIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, err
	}

	var parsedMatches []models.Match
	for _, lg := range apiResp.Data {
		for _, m := range lg.Matches {
			status := "unknown"
			switch m.Status {
			case "inprogress":
				status = "live"
			case "notstarted", "scheduled":
				status = "upcoming"
			case "finished", "ended":
				status = "finished"
			default:
				status = m.Status
			}

			loc := time.FixedZone("WIB", 7*3600)
			t := time.UnixMilli(m.Timestamp).In(loc)

			parsedMatches = append(parsedMatches, models.Match{
				ID:        m.ID,
				HomeTeam:  models.Team{Name: m.Teams.Home.Name, Logo: m.Teams.Home.Badge},
				AwayTeam:  models.Team{Name: m.Teams.Away.Name, Logo: m.Teams.Away.Badge},
				HomeScore: m.Score.Current.Home,
				AwayScore: m.Score.Current.Away,
				Status:    status,
				StartTime: t.Format("02 Jan 15:04 WIB"),
				League:    lg.League.Name,
			})
		}
	}
	return parsedMatches, nil
}

// fetchMatchDetail retrieves full match detail from the detail endpoint.
func fetchMatchDetail(id string) (models.MatchDetailView, error) {
	body, err := fetchFromAPIWithTimeout(context.Background(), "detail", map[string]string{"id": id}, 1500*time.Millisecond)
	if err != nil {
		return models.MatchDetailView{}, err
	}

	var resp models.APIDetailResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return models.MatchDetailView{}, err
	}

	mi := resp.Data.MatchInfo

	// Collect all stream sources
	var sources []models.StreamSource
	for _, s := range resp.Data.Sources {
		embedURL, ok := normalizeHTTPSURL(s.EmbedURL)
		if !ok {
			log.Printf("[MatchDetail] dropping non-https stream URL for match %s", id)
			continue
		}

		parsedURL, err := url.Parse(embedURL)
		if err != nil || !isAllowedStreamHost(parsedURL.Hostname()) {
			log.Printf("[MatchDetail] dropping disallowed stream host for match %s: %s", id, s.EmbedURL)
			continue
		}

		sources = append(sources, models.StreamSource{
			StreamNo: s.StreamNo,
			EmbedURL: embedURL,
			Source:   s.Source,
			HD:       s.HD,
			Language: s.Language,
		})
	}

	// Helper to stringify period scores (they can be null or "1-0")
	toStr := func(v interface{}) string {
		if v == nil {
			return ""
		}
		if s, ok := v.(string); ok {
			return s
		}
		return ""
	}

	info := resp.Data.Info

	return models.MatchDetailView{
		StatusDetail:  mi.StatusDetail,
		LeagueSeason:  mi.League.Season,
		LeagueRound:   mi.League.Round,
		LeagueCountry: mi.League.Country,
		LeagueFlag:    mi.League.Flag,
		LeagueLogo:    mi.League.Logo,
		HomeColor:     mi.Teams.Home.Color,
		AwayColor:     mi.Teams.Away.Color,
		HomeCode:      mi.Teams.Home.Code,
		AwayCode:      mi.Teams.Away.Code,
		ScoreDisplay:  mi.Score.Display,
		ScorePeriod1:  toStr(mi.Score.Period1),
		ScorePeriod2:  toStr(mi.Score.Period2),
		ScorePeriod3:  toStr(mi.Score.Period3),
		ScorePeriod4:  toStr(mi.Score.Period4),
		ScorePenalty:  toStr(mi.Score.Penalties),
		InjuryTime1:   mi.TimeInfo.InjuryTime1,
		InjuryTime2:   mi.TimeInfo.InjuryTime2,
		Sources:       sources,

		VenueStadium:  info.Venue.Stadium,
		VenueCity:     info.Venue.City,
		VenueCountry:  info.Venue.Country,
		VenueImage:    info.Venue.Image,
		VenueCapacity: info.Venue.Capacity,

		RefereeName:    info.Referee.Name,
		RefereeCountry: info.Referee.Country,
		RefereePhoto:   info.Referee.Photo,
		RefereeGames:   info.Referee.GamesRecorded,
		RefereeYellow:  info.Referee.YellowCards,
		RefereeRed:     info.Referee.RedCards,

		ManagerHomeName:    info.Managers.Home.Name,
		ManagerHomeCountry: info.Managers.Home.Country,
		ManagerHomePhoto:   info.Managers.Home.Photo,
		ManagerAwayName:    info.Managers.Away.Name,
		ManagerAwayCountry: info.Managers.Away.Country,
		ManagerAwayPhoto:   info.Managers.Away.Photo,
	}, nil
}

// fetchAccount retrieves the current API account info.
func fetchAccount() (models.AccountInfo, error) {
	upstreams, err := loadUpstreamConfigs()
	if err != nil {
		return models.AccountInfo{}, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	accounts := make([]models.AccountInfo, 0, len(upstreams))
	var lastErr error
	for _, upstream := range upstreams {
		body, _, reqErr := doUpstreamRequest(ctx, upstream, upstream.BaseURL+"?type=account")
		if reqErr != nil {
			lastErr = reqErr
			continue
		}

		var apiResp struct {
			Success bool `json:"success"`
			Data    struct {
				Plan       string `json:"plan"`
				LimitDaily int    `json:"limit_daily"`
				UsageToday int    `json:"usage_today"`
				ResetIn    string `json:"reset_in"`
			} `json:"data"`
		}

		if err := json.Unmarshal(body, &apiResp); err != nil {
			lastErr = err
			continue
		}

		accounts = append(accounts, models.AccountInfo{
			Plan:       apiResp.Data.Plan,
			DailyLimit: apiResp.Data.LimitDaily,
			UsageToday: apiResp.Data.UsageToday,
			ResetAt:    apiResp.Data.ResetIn,
		})
	}

	if len(accounts) == 0 {
		if lastErr == nil {
			lastErr = errors.New("all upstream account requests failed")
		}
		return models.AccountInfo{}, lastErr
	}

	return aggregateAccounts(accounts, len(upstreams), len(accounts) != len(upstreams)), nil
}

// fetchSports retrieves the list of available sports from the API.
func fetchSports() ([]models.Sport, error) {
	body, err := fetchFromAPI("sports", nil)
	if err != nil {
		return nil, err
	}

	var apiResp models.APISportsResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, err
	}
	return apiResp.Data, nil
}
