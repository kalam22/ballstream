package handlers

import (
	"football-stream/models"
	"log"
	"sync"
	"time"
)

const (
	MatchesRefreshInterval = 10 * time.Minute
	AccountRefreshInterval = 5 * time.Minute
	SportsRefreshInterval  = 1 * time.Hour
	MatchDetailCacheTTL    = 30 * time.Second // Cache match detail for 30 seconds
)

var (
	cacheMutex       sync.RWMutex
	matchesCache     []models.Match
	matchesByID      = map[string]models.Match{} // O(1) lookup by ID
	accountCache     models.AccountInfo
	sportsCache      []models.Sport
	matchDetailCache = map[string]cachedMatchDetail{}
	cacheReady       = make(chan struct{})
	cacheReadyOnce   sync.Once
)

type cachedMatchDetail struct {
	View      models.MatchDetailView
	FetchedAt time.Time
}

func setMatchesCache(matches []models.Match, reason string) {
	// Build O(1) lookup index alongside the slice
	idx := make(map[string]models.Match, len(matches))
	for _, m := range matches {
		idx[m.ID] = m
	}
	cacheMutex.Lock()
	matchesCache = matches
	matchesByID = idx
	cacheMutex.Unlock()
	log.Printf("[Cache] matches updated (%s): %d records", reason, len(matches))
}

func setAccountCache(acc models.AccountInfo, reason string) {
	cacheMutex.Lock()
	accountCache = acc
	cacheMutex.Unlock()
	log.Printf("[Cache] account updated (%s): plan=%s usage=%d/%d", reason, acc.Plan, acc.UsageToday, acc.DailyLimit)
}

func setSportsCache(sports []models.Sport, reason string) {
	cacheMutex.Lock()
	sportsCache = sports
	cacheMutex.Unlock()
	log.Printf("[Cache] sports updated (%s): %d records", reason, len(sports))
}

// GetMatchDetailCache returns cached match detail if available and not expired
func GetMatchDetailCache(id string) (models.MatchDetailView, bool) {
	cacheMutex.RLock()
	defer cacheMutex.RUnlock()
	
	entry, ok := matchDetailCache[id]
	if !ok {
		return models.MatchDetailView{}, false
	}
	
	// Check if cache is still valid (30 seconds TTL)
	if time.Since(entry.FetchedAt) > MatchDetailCacheTTL {
		return models.MatchDetailView{}, false
	}
	
	return entry.View, true
}

// SetMatchDetailCache stores match detail in cache
func SetMatchDetailCache(id string, view models.MatchDetailView) {
	cacheMutex.Lock()
	matchDetailCache[id] = cachedMatchDetail{
		View:      view,
		FetchedAt: time.Now().UTC(),
	}
	cacheMutex.Unlock()
}

// StartCacheUpdater preloads all caches in parallel, then starts background refresh loops.
func StartCacheUpdater() {
	var wg sync.WaitGroup
	wg.Add(3)

	go func() {
		defer wg.Done()
		if matches, err := fetchMatches("", "", ""); err == nil {
			setMatchesCache(matches, "initial preload")
		} else {
			log.Printf("[Cache Error] Initial fetchMatches failed: %v", err)
		}
	}()
	go func() {
		defer wg.Done()
		if acc, err := fetchAccount(); err == nil {
			setAccountCache(acc, "initial preload")
		} else {
			log.Printf("[Cache Error] Initial fetchAccount failed: %v", err)
		}
	}()
	go func() {
		defer wg.Done()
		if sp, err := fetchSports(); err == nil {
			setSportsCache(sp, "initial preload")
		} else {
			log.Printf("[Cache Error] Initial fetchSports failed: %v", err)
		}
	}()

	wg.Wait()
	log.Println("[Cache] Initial preload complete.")

	// Warn if starting with empty cache
	cacheMutex.RLock()
	emptyMatches := len(matchesCache) == 0
	cacheMutex.RUnlock()
	if emptyMatches {
		log.Println("[Cache] WARNING: Starting with empty match cache — API may be unavailable")
	}

	// Signal that cache is ready
	cacheReadyOnce.Do(func() {
		close(cacheReady)
	})

	// Evict stale matchDetailCache entries every 5 minutes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			cutoff := time.Now().Add(-MatchDetailCacheTTL * 10)
			cacheMutex.Lock()
			for id, entry := range matchDetailCache {
				if entry.FetchedAt.Before(cutoff) {
					delete(matchDetailCache, id)
				}
			}
			cacheMutex.Unlock()
		}
	}()

	// Matches: refresh every 30 seconds
	go func() {
		for {
			time.Sleep(MatchesRefreshInterval)
			matches, err := fetchMatches("", "", "")
			if err != nil {
				log.Printf("[Cache Error] fetchMatches update failed: %v", err)
				continue
			}
			setMatchesCache(matches, "scheduled refresh")
		}
	}()

	// Account: refresh every 5 minutes
	go func() {
		for {
			time.Sleep(AccountRefreshInterval)
			acc, err := fetchAccount()
			if err != nil {
				log.Printf("[Cache Error] fetchAccount update failed: %v", err)
				continue
			}
			setAccountCache(acc, "scheduled refresh")
		}
	}()

	// Sports: refresh every hour
	go func() {
		for {
			time.Sleep(SportsRefreshInterval)
			sp, err := fetchSports()
			if err != nil {
				log.Printf("[Cache Error] fetchSports update failed: %v", err)
				continue
			}
			setSportsCache(sp, "scheduled refresh")
		}
	}()
}

// GetMatchesFromCache returns the current cached match list.
func GetMatchesFromCache() []models.Match {
	cacheMutex.RLock()
	defer cacheMutex.RUnlock()
	return matchesCache
}

// GetMatchByID looks up a single match by ID from the cache in O(1).
func GetMatchByID(id string) (models.Match, bool) {
	cacheMutex.RLock()
	defer cacheMutex.RUnlock()
	m, ok := matchesByID[id]
	return m, ok
}

// GetAccountFromCache returns the current cached account info.
func GetAccountFromCache() models.AccountInfo {
	cacheMutex.RLock()
	defer cacheMutex.RUnlock()
	return accountCache
}

// GetSportsFromCache returns the current cached sports list.
func GetSportsFromCache() []models.Sport {
	cacheMutex.RLock()
	defer cacheMutex.RUnlock()
	return sportsCache
}

// WaitForCacheReady blocks until the initial cache preload is complete.
func WaitForCacheReady() {
	<-cacheReady
}

// IsCacheReady returns true if the initial cache preload is complete.
func IsCacheReady() bool {
	select {
	case <-cacheReady:
		return true
	default:
		return false
	}
}
