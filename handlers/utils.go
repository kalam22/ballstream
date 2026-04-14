package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
)

// GetIntParam extracts an integer query parameter with a default value
func GetIntParam(r *http.Request, key string, defaultValue int) int {
	val := r.URL.Query().Get(key)
	if val == "" {
		return defaultValue
	}
	
	intVal, err := strconv.Atoi(val)
	if err != nil || intVal < 1 {
		return defaultValue
	}
	
	return intVal
}

// GenerateRequestID generates a unique request ID
func GenerateRequestID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Fallback to timestamp-based ID if random fails
		return strconv.FormatInt(int64(1000000000), 36)
	}
	return hex.EncodeToString(b)
}

// CalculatePagination calculates pagination boundaries
func CalculatePagination(total, page, limit int) (start, end int) {
	start = (page - 1) * limit
	if start < 0 {
		start = 0
	}
	if start >= total {
		start = total
	}
	
	end = start + limit
	if end > total {
		end = total
	}
	
	return start, end
}

// CalculateTotalPages calculates total pages for pagination
func CalculateTotalPages(total, limit int) int {
	if limit <= 0 {
		return 0
	}
	return (total + limit - 1) / limit
}

// parseDeviceName converts a raw User-Agent string into a human-friendly device name.
// Examples:
//   "iPhone, iOS 16"
//   "Samsung Galaxy S24, Android 14"
//   "Windows 11 · Chrome"
//   "macOS · Safari"
func parseDeviceName(ua string) string {
	if ua == "" {
		return "Unknown Device"
	}

	// ── iOS / iPadOS ──────────────────────────────────────────────────────────
	// UA contains "iPhone" or "iPad" but never the exact model number (Apple policy).
	if contains(ua, "iPhone") {
		os := extractIOSVersion(ua)
		return "iPhone · " + os
	}
	if contains(ua, "iPad") {
		os := extractIOSVersion(ua)
		return "iPad · " + os
	}

	// ── Android ───────────────────────────────────────────────────────────────
	// Android UA format: "... (Linux; Android 14; Pixel 8 Build/...)"
	// or Samsung: "... (Linux; Android 14; SM-S928B Build/...)"
	if contains(ua, "Android") {
		model := extractAndroidModel(ua)
		version := extractAndroidVersion(ua)
		if model != "" {
			return model + " · Android " + version
		}
		return "Android " + version
	}

	// ── macOS ─────────────────────────────────────────────────────────────────
	if contains(ua, "Macintosh") || contains(ua, "Mac OS X") {
		browser := extractBrowser(ua)
		return "macOS · " + browser
	}

	// ── Windows ───────────────────────────────────────────────────────────────
	if contains(ua, "Windows NT") {
		winVer := extractWindowsVersion(ua)
		browser := extractBrowser(ua)
		return winVer + " · " + browser
	}

	// ── Linux Desktop ─────────────────────────────────────────────────────────
	if contains(ua, "Linux") && contains(ua, "X11") {
		browser := extractBrowser(ua)
		return "Linux · " + browser
	}

	// ── Fallback: just extract browser ────────────────────────────────────────
	browser := extractBrowser(ua)
	if browser != "" {
		return browser
	}
	return "Unknown Device"
}

// contains is a case-insensitive substring check.
func contains(s, sub string) bool {
	return len(s) >= len(sub) && indexCI(s, sub) >= 0
}

func indexCI(s, sub string) int {
	sl, subl := len(s), len(sub)
	for i := 0; i <= sl-subl; i++ {
		match := true
		for j := 0; j < subl; j++ {
			cs, csub := s[i+j], sub[j]
			if cs >= 'A' && cs <= 'Z' {
				cs += 32
			}
			if csub >= 'A' && csub <= 'Z' {
				csub += 32
			}
			if cs != csub {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

// extractIOSVersion pulls "iOS 16.5" from the UA string.
func extractIOSVersion(ua string) string {
	// "CPU iPhone OS 16_5 like" or "CPU OS 16_5 like"
	markers := []string{"CPU iPhone OS ", "CPU OS "}
	for _, m := range markers {
		idx := indexCI(ua, m)
		if idx < 0 {
			continue
		}
		start := idx + len(m)
		end := start
		for end < len(ua) && ua[end] != ' ' && ua[end] != ')' {
			end++
		}
		ver := ua[start:end]
		// Replace underscores with dots: "16_5" → "16.5"
		result := ""
		for _, c := range ver {
			if c == '_' {
				result += "."
			} else {
				result += string(c)
			}
		}
		return "iOS " + result
	}
	return "iOS"
}

// extractAndroidVersion pulls "14" from "Android 14".
func extractAndroidVersion(ua string) string {
	marker := "Android "
	idx := indexCI(ua, marker)
	if idx < 0 {
		return ""
	}
	start := idx + len(marker)
	end := start
	for end < len(ua) && ua[end] != ';' && ua[end] != ')' && ua[end] != ' ' {
		end++
	}
	return ua[start:end]
}

// extractAndroidModel pulls the device model from the Android UA.
// Format: "(Linux; Android 14; <Model> Build/...)"
func extractAndroidModel(ua string) string {
	// Find the third semicolon segment inside the first parenthesis group
	start := -1
	for i, c := range ua {
		if c == '(' {
			start = i + 1
			break
		}
	}
	if start < 0 {
		return ""
	}
	end := start
	for end < len(ua) && ua[end] != ')' {
		end++
	}
	inner := ua[start:end] // e.g. "Linux; Android 14; Pixel 8 Build/UP1A"

	// Split by ";"
	parts := splitSemicolon(inner)
	if len(parts) < 3 {
		return ""
	}
	model := trim(parts[2])

	// Remove " Build/..." suffix
	buildIdx := indexCI(model, " Build/")
	if buildIdx >= 0 {
		model = model[:buildIdx]
	}
	buildIdx = indexCI(model, " build/")
	if buildIdx >= 0 {
		model = model[:buildIdx]
	}

	// Translate Samsung model codes to friendly names
	model = translateSamsungModel(model)

	return model
}

// translateSamsungModel maps SM-XXXX codes to marketing names for common models.
func translateSamsungModel(model string) string {
	table := map[string]string{
		// Galaxy S25 series
		"SM-S931": "Samsung Galaxy S25",
		"SM-S936": "Samsung Galaxy S25+",
		"SM-S938": "Samsung Galaxy S25 Ultra",
		// Galaxy S24 series
		"SM-S921": "Samsung Galaxy S24",
		"SM-S926": "Samsung Galaxy S24+",
		"SM-S928": "Samsung Galaxy S24 Ultra",
		// Galaxy S23 series
		"SM-S911": "Samsung Galaxy S23",
		"SM-S916": "Samsung Galaxy S23+",
		"SM-S918": "Samsung Galaxy S23 Ultra",
		// Galaxy S22 series
		"SM-S901": "Samsung Galaxy S22",
		"SM-S906": "Samsung Galaxy S22+",
		"SM-S908": "Samsung Galaxy S22 Ultra",
		// Galaxy A series
		"SM-A546": "Samsung Galaxy A54",
		"SM-A536": "Samsung Galaxy A53",
		"SM-A346": "Samsung Galaxy A34",
		"SM-A336": "Samsung Galaxy A33",
		"SM-A256": "Samsung Galaxy A25",
		"SM-A156": "Samsung Galaxy A15",
		// Galaxy Z series
		"SM-F946": "Samsung Galaxy Z Fold5",
		"SM-F731": "Samsung Galaxy Z Flip5",
		"SM-F936": "Samsung Galaxy Z Fold4",
		"SM-F721": "Samsung Galaxy Z Flip4",
	}
	// Match by prefix (first 7 chars of model code)
	prefix := model
	if len(prefix) > 7 {
		prefix = prefix[:7]
	}
	if friendly, ok := table[prefix]; ok {
		return friendly
	}
	return model
}

// extractWindowsVersion maps NT version numbers to marketing names.
func extractWindowsVersion(ua string) string {
	if contains(ua, "Windows NT 10.0") {
		// Windows 10 and 11 both report NT 10.0; can't distinguish without hints
		return "Windows 10/11"
	}
	if contains(ua, "Windows NT 6.3") {
		return "Windows 8.1"
	}
	if contains(ua, "Windows NT 6.2") {
		return "Windows 8"
	}
	if contains(ua, "Windows NT 6.1") {
		return "Windows 7"
	}
	return "Windows"
}

// extractBrowser returns the most recognisable browser name from the UA.
func extractBrowser(ua string) string {
	switch {
	case contains(ua, "Edg/") || contains(ua, "Edge/"):
		return "Edge"
	case contains(ua, "OPR/") || contains(ua, "Opera"):
		return "Opera"
	case contains(ua, "Brave"):
		return "Brave"
	case contains(ua, "YaBrowser"):
		return "Yandex Browser"
	case contains(ua, "SamsungBrowser"):
		return "Samsung Internet"
	case contains(ua, "Chrome/"):
		return "Chrome"
	case contains(ua, "Firefox/"):
		return "Firefox"
	case contains(ua, "Safari/") && contains(ua, "Version/"):
		return "Safari"
	default:
		return "Browser"
	}
}

// splitSemicolon splits a string by ";" and trims spaces.
func splitSemicolon(s string) []string {
	var parts []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == ';' {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	parts = append(parts, s[start:])
	return parts
}

// trim removes leading and trailing spaces.
func trim(s string) string {
	start, end := 0, len(s)
	for start < end && s[start] == ' ' {
		start++
	}
	for end > start && s[end-1] == ' ' {
		end--
	}
	return s[start:end]
}

// isValidEmail validates email format using a simple but effective regex.
func isValidEmail(email string) bool {
	if len(email) == 0 || len(email) > 254 {
		return false
	}
	// Must have exactly one @, local part and domain
	atIdx := -1
	for i, c := range email {
		if c == '@' {
			if atIdx >= 0 {
				return false // multiple @
			}
			atIdx = i
		}
	}
	if atIdx <= 0 || atIdx >= len(email)-1 {
		return false
	}
	domain := email[atIdx+1:]
	// Domain must have at least one dot and no leading/trailing dots
	if domain[0] == '.' || domain[len(domain)-1] == '.' {
		return false
	}
	hasDot := false
	for _, c := range domain {
		if c == '.' {
			hasDot = true
		}
	}
	return hasDot
}
