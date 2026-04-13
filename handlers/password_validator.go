package handlers



// ValidatePasswordStrength checks password complexity
func ValidatePasswordStrength(password string) (bool, string) {
	if len(password) == 0 {
		return false, "Password cannot be empty"
	}
	
	if len(password) > 128 {
		return false, "Password must not exceed 128 characters"
	}
	
	return true, ""
}
