package handlers

import "unicode"

// ValidatePasswordStrength checks password complexity.
// Requirements: 8-128 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char.
func ValidatePasswordStrength(password string) (bool, string) {
	if len(password) == 0 {
		return false, "Password tidak boleh kosong"
	}
	if len(password) < 8 {
		return false, "Password minimal 8 karakter"
	}
	if len(password) > 128 {
		return false, "Password maksimal 128 karakter"
	}

	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, c := range password {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsDigit(c):
			hasDigit = true
		case unicode.IsPunct(c) || unicode.IsSymbol(c):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return false, "Password harus mengandung minimal 1 huruf kapital"
	}
	if !hasLower {
		return false, "Password harus mengandung minimal 1 huruf kecil"
	}
	if !hasDigit {
		return false, "Password harus mengandung minimal 1 angka"
	}
	if !hasSpecial {
		return false, "Password harus mengandung minimal 1 karakter spesial (!@#$%^&* dll)"
	}

	return true, ""
}
