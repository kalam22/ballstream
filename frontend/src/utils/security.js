/**
 * Security utilities for frontend
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all HTML tags and dangerous characters
 */
export function sanitizeHTML(str) {
  if (!str) return '';
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(str) {
  if (!str) return '';
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return String(str).replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Returns { valid: boolean, message: string }
 */
export function validatePassword(password) {
  if (!password) {
    return { valid: false, message: 'Password tidak boleh kosong' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password maksimal 128 karakter' };
  }
  
  return { valid: true, message: '' };
}

/**
 * Check if URL is safe (prevent javascript: and data: URLs)
 */
export function isSafeURL(url) {
  if (!url) return false;
  
  const urlStr = String(url).toLowerCase().trim();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (urlStr.startsWith(protocol)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Rate limit function calls (client-side)
 * Useful for preventing rapid API calls
 */
export function rateLimit(fn, delay = 1000) {
  let lastCall = 0;
  
  return function(...args) {
    const now = Date.now();
    if (now - lastCall < delay) {
      return Promise.reject(new Error('Terlalu banyak permintaan. Tunggu sebentar.'));
    }
    lastCall = now;
    return fn.apply(this, args);
  };
}

/**
 * Debounce function calls
 */
export function debounce(fn, delay = 250) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Generate a random string (for client-side IDs, not security)
 */
export function generateRandomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
