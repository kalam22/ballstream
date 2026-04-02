package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
)

type upstreamLatencyMetric struct {
	Count        int64
	TotalMicros  int64
	ErrorCount   int64
	LastStatus   int64
	LastDuration int64
}

var (
	totalRequests       atomic.Int64
	rateLimitedTotal    atomic.Int64
	cacheHitTotal       atomic.Int64
	cacheMissTotal      atomic.Int64
	statusMetricStore   sync.Map
	cacheMetricStore    sync.Map
	upstreamMetricStore sync.Map
)

func RecordHTTPRequest(path string, statusCode int) {
	totalRequests.Add(1)
	key := sanitizeMetricLabel(routeMetricGroup(path) + "_" + strconv.Itoa(statusCode))
	counter, _ := statusMetricStore.LoadOrStore(key, &atomic.Int64{})
	counter.(*atomic.Int64).Add(1)
}

func RecordRateLimited(path string) {
	rateLimitedTotal.Add(1)
	key := sanitizeMetricLabel(routeMetricGroup(path))
	counter, _ := statusMetricStore.LoadOrStore(key+"_429", &atomic.Int64{})
	counter.(*atomic.Int64).Add(1)
}

func RecordCacheHit(name string) {
	cacheHitTotal.Add(1)
	recordNamedCounter(&cacheMetricStore, sanitizeMetricLabel(name+"_hit"))
}

func RecordCacheMiss(name string) {
	cacheMissTotal.Add(1)
	recordNamedCounter(&cacheMetricStore, sanitizeMetricLabel(name+"_miss"))
}

func RecordUpstreamObservation(name string, statusCode int, durationMicros int64, err error) {
	metricAny, _ := upstreamMetricStore.LoadOrStore(name, &upstreamLatencyMetric{})
	metric := metricAny.(*upstreamLatencyMetric)
	atomic.AddInt64(&metric.Count, 1)
	atomic.AddInt64(&metric.TotalMicros, durationMicros)
	atomic.StoreInt64(&metric.LastDuration, durationMicros)
	atomic.StoreInt64(&metric.LastStatus, int64(statusCode))
	if err != nil {
		atomic.AddInt64(&metric.ErrorCount, 1)
	}
}

func recordNamedCounter(store *sync.Map, key string) {
	counter, _ := store.LoadOrStore(key, &atomic.Int64{})
	counter.(*atomic.Int64).Add(1)
}

func sanitizeMetricLabel(v string) string {
	v = strings.ToLower(v)
	v = strings.ReplaceAll(v, "/", "_")
	v = strings.ReplaceAll(v, "-", "_")
	v = strings.ReplaceAll(v, ".", "_")
	return v
}

func routeMetricGroup(path string) string {
	switch {
	case strings.HasPrefix(path, "/api/upstreams"):
		return "api_upstreams"
	case strings.HasPrefix(path, "/internal/metrics"):
		return "internal_metrics"
	case strings.HasPrefix(path, "/api/"):
		return "api"
	case strings.HasPrefix(path, "/match/"):
		return "match"
	case path == "/status":
		return "status"
	case path == "/":
		return "home"
	default:
		return "other"
	}
}

func MetricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")

	var lines []string
	lines = append(lines,
		"# HELP app_requests_total Total HTTP requests handled by the app.",
		"# TYPE app_requests_total counter",
		fmt.Sprintf("app_requests_total %d", totalRequests.Load()),
		"# HELP app_rate_limited_total Total HTTP requests rejected by rate limiting.",
		"# TYPE app_rate_limited_total counter",
		fmt.Sprintf("app_rate_limited_total %d", rateLimitedTotal.Load()),
		"# HELP app_cache_hits_total Total cache hits recorded by the app.",
		"# TYPE app_cache_hits_total counter",
		fmt.Sprintf("app_cache_hits_total %d", cacheHitTotal.Load()),
		"# HELP app_cache_misses_total Total cache misses recorded by the app.",
		"# TYPE app_cache_misses_total counter",
		fmt.Sprintf("app_cache_misses_total %d", cacheMissTotal.Load()),
	)

	lines = append(lines, snapshotNamedCounters("app_response_status_total", &statusMetricStore)...)
	lines = append(lines, snapshotNamedCounters("app_cache_events_total", &cacheMetricStore)...)
	lines = append(lines, snapshotUpstreamMetrics()...)
	lines = append(lines, snapshotCircuitMetrics()...)

	_, _ = w.Write([]byte(strings.Join(lines, "\n") + "\n"))
}

func snapshotNamedCounters(metricName string, store *sync.Map) []string {
	type pair struct {
		Key   string
		Value int64
	}
	var values []pair
	store.Range(func(key, value any) bool {
		values = append(values, pair{
			Key:   key.(string),
			Value: value.(*atomic.Int64).Load(),
		})
		return true
	})
	sort.Slice(values, func(i, j int) bool { return values[i].Key < values[j].Key })
	lines := []string{
		fmt.Sprintf("# HELP %s Named counters exported by the app.", metricName),
		fmt.Sprintf("# TYPE %s counter", metricName),
	}
	for _, item := range values {
		lines = append(lines, fmt.Sprintf(`%s{key=%q} %d`, metricName, item.Key, item.Value))
	}
	return lines
}

func snapshotUpstreamMetrics() []string {
	type pair struct {
		Name  string
		Count int64
		Total int64
		Error int64
		Last  int64
		Stat  int64
	}
	var values []pair
	upstreamMetricStore.Range(func(key, value any) bool {
		metric := value.(*upstreamLatencyMetric)
		values = append(values, pair{
			Name:  key.(string),
			Count: atomic.LoadInt64(&metric.Count),
			Total: atomic.LoadInt64(&metric.TotalMicros),
			Error: atomic.LoadInt64(&metric.ErrorCount),
			Last:  atomic.LoadInt64(&metric.LastDuration),
			Stat:  atomic.LoadInt64(&metric.LastStatus),
		})
		return true
	})
	sort.Slice(values, func(i, j int) bool { return values[i].Name < values[j].Name })
	lines := []string{
		"# HELP app_upstream_requests_total Total upstream requests by upstream name.",
		"# TYPE app_upstream_requests_total counter",
		"# HELP app_upstream_latency_microseconds_total Total upstream latency in microseconds.",
		"# TYPE app_upstream_latency_microseconds_total counter",
		"# HELP app_upstream_errors_total Total upstream errors by upstream name.",
		"# TYPE app_upstream_errors_total counter",
		"# HELP app_upstream_last_latency_microseconds Last upstream latency in microseconds.",
		"# TYPE app_upstream_last_latency_microseconds gauge",
		"# HELP app_upstream_last_status_code Last upstream HTTP status code.",
		"# TYPE app_upstream_last_status_code gauge",
	}
	for _, item := range values {
		lines = append(lines,
			fmt.Sprintf(`app_upstream_requests_total{name=%q} %d`, item.Name, item.Count),
			fmt.Sprintf(`app_upstream_latency_microseconds_total{name=%q} %d`, item.Name, item.Total),
			fmt.Sprintf(`app_upstream_errors_total{name=%q} %d`, item.Name, item.Error),
			fmt.Sprintf(`app_upstream_last_latency_microseconds{name=%q} %d`, item.Name, item.Last),
			fmt.Sprintf(`app_upstream_last_status_code{name=%q} %d`, item.Name, item.Stat),
		)
	}
	return lines
}

func snapshotCircuitMetrics() []string {
	health := GetUpstreamHealth()
	lines := []string{
		"# HELP app_upstream_circuit_open Whether an upstream circuit breaker is currently open.",
		"# TYPE app_upstream_circuit_open gauge",
	}
	for _, item := range health {
		value := 0
		if item.CircuitState == "open" {
			value = 1
		}
		lines = append(lines, fmt.Sprintf(`app_upstream_circuit_open{name=%q} %d`, item.Name, value))
	}
	return lines
}
