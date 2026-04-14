/**
 * Themed SweetAlert2 wrapper — matches kana.stream design system.
 *
 * Usage:
 *   import { swal } from '../utils/swal'
 *   await swal.confirm({ title: '...', text: '...' })
 *   await swal.success({ title: '...', text: '...' })
 *   await swal.error({ title: '...', text: '...' })
 *   await swal.warning({ title: '...', text: '...' })
 *   await swal.info({ title: '...', text: '...' })
 */

import Swal from 'sweetalert2'

// Read current theme from <html data-theme="...">
function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

// Base config that matches the kana.stream design system
function baseConfig() {
  const dark = isDark()
  return {
    background:          dark ? '#1a2332' : '#ffffff',
    color:               dark ? '#f1f5f9' : '#0f172a',
    confirmButtonColor:  '#02ff97',
    cancelButtonColor:   dark ? '#2d3748' : '#e2e8f0',
    confirmButtonText:   'OK',
    customClass: {
      popup:            'ks-swal-popup',
      title:            'ks-swal-title',
      htmlContainer:    'ks-swal-html',
      confirmButton:    'ks-swal-confirm',
      cancelButton:     'ks-swal-cancel',
      icon:             'ks-swal-icon',
    },
  }
}

// Inject global SweetAlert2 styles once
let stylesInjected = false
function injectStyles() {
  if (stylesInjected) return
  stylesInjected = true

  const style = document.createElement('style')
  style.textContent = `
    .ks-swal-popup {
      border-radius: 18px !important;
      border: 1px solid var(--border) !important;
      font-family: 'Poppins', system-ui, sans-serif !important;
      padding: 2rem !important;
      box-shadow: 0 24px 64px rgba(0,0,0,0.25) !important;
    }
    .ks-swal-title {
      font-size: 1.25rem !important;
      font-weight: 700 !important;
      letter-spacing: -0.3px !important;
    }
    .ks-swal-html {
      font-size: 0.9rem !important;
      line-height: 1.6 !important;
      color: var(--text-muted) !important;
    }
    .ks-swal-confirm {
      border-radius: 100px !important;
      font-weight: 700 !important;
      font-size: 0.9rem !important;
      padding: 0.65rem 1.75rem !important;
      color: #0f172a !important;
      border: none !important;
      transition: all 0.2s ease !important;
      font-family: 'Poppins', system-ui, sans-serif !important;
    }
    .ks-swal-confirm:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 16px rgba(2,255,151,0.4) !important;
    }
    .ks-swal-cancel {
      border-radius: 100px !important;
      font-weight: 600 !important;
      font-size: 0.9rem !important;
      padding: 0.65rem 1.75rem !important;
      border: 1px solid var(--border) !important;
      transition: all 0.2s ease !important;
      font-family: 'Poppins', system-ui, sans-serif !important;
    }
    .ks-swal-cancel:hover {
      transform: translateY(-1px) !important;
    }
    .ks-swal-icon {
      border: none !important;
      margin-bottom: 0.5rem !important;
    }
    /* Accent-colored icon for success */
    .swal2-success .swal2-success-ring {
      border-color: rgba(2,255,151,0.3) !important;
    }
    .swal2-success [class^=swal2-success-line] {
      background-color: #02ff97 !important;
    }
  `
  document.head.appendChild(style)
}

export const swal = {
  /** Confirmation dialog — returns true if confirmed */
  async confirm({ title, text, html, confirmText = 'Ya', cancelText = 'Batal' } = {}) {
    injectStyles()
    const result = await Swal.fire({
      ...baseConfig(),
      title,
      text,
      html,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    })
    return result.isConfirmed
  },

  /** Success notification */
  async success({ title, text, html, timer = 2500, showConfirmButton = false } = {}) {
    injectStyles()
    return Swal.fire({
      ...baseConfig(),
      title,
      text,
      html,
      icon: 'success',
      timer,
      showConfirmButton,
      timerProgressBar: true,
    })
  },

  /** Error notification */
  async error({ title = 'Terjadi Kesalahan', text, html } = {}) {
    injectStyles()
    return Swal.fire({
      ...baseConfig(),
      title,
      text,
      html,
      icon: 'error',
      confirmButtonText: 'Tutup',
    })
  },

  /** Warning dialog — returns true if confirmed */
  async warning({ title, text, html, confirmText = 'Lanjutkan', cancelText = 'Batal' } = {}) {
    injectStyles()
    const result = await Swal.fire({
      ...baseConfig(),
      title,
      text,
      html,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    })
    return result.isConfirmed
  },

  /** Info / notice dialog */
  async info({ title, text, html, confirmText = 'Mengerti', allowOutsideClick = true } = {}) {
    injectStyles()
    return Swal.fire({
      ...baseConfig(),
      title,
      text,
      html,
      icon: 'info',
      confirmButtonText: confirmText,
      allowOutsideClick,
    })
  },

  /** Session ended — non-dismissable */
  async sessionEnded() {
    injectStyles()
    return Swal.fire({
      ...baseConfig(),
      title: '🔒 Sesi Berakhir',
      html: `
        <p style="font-size:0.9rem;line-height:1.6;margin-bottom:0.25rem;">
          Akun Anda baru saja login di perangkat lain.
        </p>
        <p style="font-size:0.8rem;opacity:0.65;">
          Sesi di perangkat ini telah diakhiri secara otomatis.
        </p>
      `,
      icon: 'info',
      confirmButtonText: 'Login Kembali',
      allowOutsideClick: false,
    })
  },

  /** Already logged in on another device */
  async alreadyLoggedIn(email) {
    injectStyles()
    const safe = String(email).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c])
    )
    return Swal.fire({
      ...baseConfig(),
      title: '⚠️ Akun Sedang Aktif',
      html: `
        <p style="font-size:0.9rem;line-height:1.6;margin-bottom:0.25rem;">
          Akun <strong>${safe}</strong> sedang aktif di perangkat lain.
        </p>
        <p style="font-size:0.8rem;opacity:0.65;">
          Silakan logout dari perangkat tersebut terlebih dahulu.
        </p>
      `,
      icon: 'warning',
      confirmButtonText: 'Mengerti',
    })
  },
}
