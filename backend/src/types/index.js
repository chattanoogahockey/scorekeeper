/**
 * @typedef {Object} Game
 * @property {string} id - Unique game identifier
 * @property {string} gameId - Alternative game identifier
 * @property {string} homeTeam - Home team name
 * @property {string} awayTeam - Away team name
 * @property {string} division - Game division/league
 * @property {string} season - Season identifier
 * @property {number} year - Season year
 * @property {string} seasonType - Season type (Fall, Winter, Spring)
 * @property {string} status - Game status
 * @property {string} scheduledDate - Scheduled date
 * @property {string} scheduledTime - Scheduled time
 * @property {string} rink - Rink location
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} Goal
 * @property {string} id - Unique goal identifier
 * @property {string} gameId - Associated game ID
 * @property {string} eventType - Event type (always 'goal')
 * @property {string} teamName - Scoring team name
 * @property {string} playerName - Goal scorer name
 * @property {string[]} assistedBy - Assist players
 * @property {string} period - Game period
 * @property {string} timeRemaining - Time remaining when scored
 * @property {string} shotType - Type of shot
 * @property {string} goalType - Goal type (even strength, power play, etc.)
 * @property {boolean} breakaway - Whether it was a breakaway
 * @property {string} recordedAt - Recording timestamp
 * @property {string} gameStatus - Game status at time of goal
 * @property {Object} analytics - Advanced analytics data
 */

/**
 * @typedef {Object} Penalty
 * @property {string} id - Unique penalty identifier
 * @property {string} gameId - Associated game ID
 * @property {string} teamName - Penalized team name
 * @property {string} playerName - Penalized player name
 * @property {string} penaltyType - Type of penalty
 * @property {string} length - Penalty length in minutes
 * @property {string} period - Game period
 * @property {string} timeRemaining - Time remaining when penalty occurred
 * @property {Object} details - Additional penalty details
 * @property {string} recordedAt - Recording timestamp
 * @property {string} gameStatus - Game status at time of penalty
 * @property {Object} analytics - Advanced analytics data
 */

/**
 * @typedef {Object} Roster
 * @property {string} id - Unique roster identifier
 * @property {string} teamName - Team name
 * @property {string} season - Season identifier
 * @property {number} year - Season year
 * @property {string} seasonType - Season type
 * @property {string} division - Team division
 * @property {Player[]} players - Team players
 * @property {number} totalPlayers - Total number of players
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} Player
 * @property {string} name - Full player name
 * @property {string} firstName - Player first name
 * @property {string} lastName - Player last name
 * @property {string|number} jerseyNumber - Jersey number
 * @property {string} position - Player position
 */

/**
 * @typedef {Object} Attendance
 * @property {string} id - Unique attendance identifier
 * @property {string} gameId - Associated game ID
 * @property {string} eventType - Event type (always 'attendance')
 * @property {string} recordedAt - Recording timestamp
 * @property {TeamRoster[]} roster - Team rosters with attendance
 * @property {TeamAttendance[]} attendance - Attendance data by team
 * @property {Object} summary - Attendance summary statistics
 */

/**
 * @typedef {Object} TeamRoster
 * @property {string} teamName - Team name
 * @property {string} teamId - Team identifier
 * @property {number} totalPlayers - Total players in roster
 * @property {PlayerCount} playerCount - Player count details
 */

/**
 * @typedef {Object} TeamAttendance
 * @property {string} teamName - Team name
 * @property {string[]} playersPresent - List of present players
 * @property {number} presentCount - Number of present players
 */

/**
 * @typedef {Object} PlayerCount
 * @property {number} total - Total players
 * @property {number} present - Present players
 * @property {number} absent - Absent players
 */

/**
 * @typedef {Object} GameSubmission
 * @property {string} id - Unique submission identifier
 * @property {string} gameId - Associated game ID
 * @property {string} eventType - Event type (always 'game-submission')
 * @property {string} submittedAt - Submission timestamp
 * @property {Object} finalScore - Final game score
 * @property {Object} gameSummary - Game summary statistics
 * @property {number} totalGoals - Total goals in game
 * @property {number} totalPenalties - Total penalties in game
 */

/**
 * @typedef {Object} AnnouncerCache
 * @property {Map<string, GoalCacheEntry>} goals - Goal announcements cache
 * @property {Map<string, PenaltyCacheEntry>} penalties - Penalty announcements cache
 * @property {Map<string, RandomCacheEntry>} randomDual - Random commentary cache
 */

/**
 * @typedef {Object} GoalCacheEntry
 * @property {string} lastGoalId - Last processed goal ID
 * @property {Object.<string, AnnouncementData>} single - Single announcer data
 * @property {ConversationData} [dual] - Dual announcer conversation
 */

/**
 * @typedef {Object} PenaltyCacheEntry
 * @property {string} lastPenaltyId - Last processed penalty ID
 * @property {Object.<string, AnnouncementData>} single - Single announcer data
 * @property {ConversationData} [dual] - Dual announcer conversation
 */

/**
 * @typedef {Object} RandomCacheEntry
 * @property {ConversationData} conversation - Random conversation data
 * @property {number} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} AnnouncementData
 * @property {string} text - Announcement text
 * @property {string} [audioPath] - Path to audio file
 * @property {string} voice - Voice identifier
 * @property {number} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} ConversationData
 * @property {string[]} conversation - Conversation lines
 * @property {number} updatedAt - Last update timestamp
 * @property {number} lineGapMs - Gap between lines in milliseconds
 */

/**
 * @typedef {Object} HealthStatus
 * @property {string} status - Overall health status
 * @property {string} message - Health status message
 * @property {string} timestamp - Status timestamp
 * @property {number} uptime - Server uptime in seconds
 * @property {string} version - Application version
 * @property {Object} services - Service health statuses
 */

/**
 * @typedef {Object} ServiceHealth
 * @property {boolean} available - Service availability
 * @property {string} status - Service status
 * @property {Object} [features] - Service features availability
 * @property {string} [provider] - Service provider
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Response success status
 * @property {*} data - Response data
 * @property {Object} [meta] - Response metadata
 * @property {string} [requestId] - Request identifier
 * @property {string} [timestamp] - Response timestamp
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {boolean} error - Error flag
 * @property {string} message - Error message
 * @property {string} timestamp - Error timestamp
 * @property {boolean} canRetry - Whether request can be retried
 * @property {string} [requestId] - Request identifier
 * @property {string} [code] - Error code
 * @property {string} [userMessage] - User-friendly error message
 * @property {*} [fallback] - Fallback data or instructions
 */
