/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} email
 * @property {string} role - 'super_admin' | 'user'
 * @property {boolean} active_session
 * @property {string} last_login
 * @property {string} created_at
 */

/**
 * @typedef {Object} Match
 * @property {string} id
 * @property {string} home_team
 * @property {string} away_team
 * @property {string} home_team_logo
 * @property {string} away_team_logo
 * @property {string} sport
 * @property {string} league
 * @property {string} start_time
 * @property {string} status
 * @property {{ home: number, away: number }} score
 */

/**
 * @typedef {Object} MatchDetail
 * @property {string} id
 * @property {string} home_team
 * @property {string} away_team
 * @property {Array<MatchEvent>} events
 * @property {Array<MatchStat>} stats
 */

/**
 * @typedef {Object} MatchEvent
 * @property {string} type
 * @property {string} team
 * @property {string} player
 * @property {string} time
 */

/**
 * @typedef {Object} MatchStat
 * @property {string} label
 * @property {number} home
 * @property {number} away
 */

/**
 * @typedef {Object} APIResponse
 * @property {boolean} success
 * @property {*} data
 * @property {{ code: string, message: string }} [error]
 */

export {};
