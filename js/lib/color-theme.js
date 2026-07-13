/**
 * Color theme helper shared by the main app shell and legacy admin/*.html
 * modules (loaded in iframes). Themes live in css/color-theme/*.css and are
 * applied by injecting a stylesheet that overrides CSS variables from color.css.
 */

export const COLOR_THEME_STORAGE_KEY = 'kaal-color-theme'
export const COLOR_THEME_LINK_ID = 'ka-color-theme'
export const COLOR_THEME_CHANNEL = 'kaal-color-theme'

let channel = null
let installed = false

/**
 * Base URL for css/color-theme/ from the current page.
 * Admin pages (and index) live under admin/, so themes are at ../css/color-theme/.
 */
export function colorThemeBaseUrl(base = window.location.href) {
  return new URL('../css/color-theme/', base)
}

export function colorThemeListUrl(base) {
  return new URL('list.php', colorThemeBaseUrl(base))
}

export function colorThemeStylesheetUrl(themeId, base) {
  return new URL(
    `${encodeURIComponent(themeId)}.css`,
    colorThemeBaseUrl(base),
  )
}

export function getStoredColorTheme() {
  try {
    return localStorage.getItem(COLOR_THEME_STORAGE_KEY) || ''
  } catch (_) {
    return ''
  }
}

/**
 * Apply a theme stylesheet to the current document.
 * @param {string} themeId
 * @param {{persist?: boolean, broadcast?: boolean}} [options]
 */
export function applyColorTheme(themeId, options = {}) {
  const {persist = true, broadcast = true} = options
  if (!themeId) { return }

  let link = document.getElementById(COLOR_THEME_LINK_ID)
  if (!link) {
    link = document.createElement('link')
    link.onerror = _ => {
      link.href = new URL('css/color.css', window.location.href)
    }

    link.id = COLOR_THEME_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }

  const href = colorThemeStylesheetUrl(themeId).href
  if (link.getAttribute('href') !== href) {
    link.href = href
  }

  if (persist) {
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, themeId)
    } catch (_) {
      /* ignore quota / private mode */
    }
  }

  if (broadcast) {
    try {
      getChannel().postMessage({type: 'theme', id: themeId})
    } catch (_) {
      /* BroadcastChannel unavailable */
    }
  }

  document.dispatchEvent(new CustomEvent('kaal-color-theme-change', {
    detail: {id: themeId},
  }))
}

export function applyStoredColorTheme() {
  const stored = getStoredColorTheme()
  if (stored) {
    applyColorTheme(stored, {persist: false, broadcast: false})
  }
  return stored
}

/**
 * Dynamically list themes from css/color-theme/ via list.php.
 * @returns {Promise<Array<{id: string, label: string, file: string}>>}
 */
export function listColorThemes() {
  return fetch(colorThemeListUrl().href, {
    headers: {Accept: 'application/json'},
    cache: 'no-store',
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Impossible de lister les thèmes')
      }
      return response.json()
    })
    .then((payload) => {
      const themes = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []
      return themes.filter((t) => t?.id)
    })
}

function getChannel() {
  if (!channel) {
    channel = new BroadcastChannel(COLOR_THEME_CHANNEL)
  }
  return channel
}

/**
 * Apply the stored theme on this document and keep it in sync when the user
 * changes theme in another frame/tab (parent app shell or another module).
 */
export function installColorThemeSync() {
  if (installed) { return }
  installed = true

  applyStoredColorTheme()

  window.addEventListener('storage', (event) => {
    if (event.key !== COLOR_THEME_STORAGE_KEY) { return }
    const id = event.newValue || ''
    if (id) {
      applyColorTheme(id, {persist: false, broadcast: false})
    } else {
      const link = document.getElementById(COLOR_THEME_LINK_ID)
      if (link) { link.remove() }
    }
  })

  try {
    getChannel().addEventListener('message', (event) => {
      if (event.data?.type !== 'theme' || !event.data?.id) { return }
      applyColorTheme(event.data.id, {persist: false, broadcast: false})
    })
  } catch (_) {
    /* BroadcastChannel unavailable */
  }
}
