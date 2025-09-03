/**
 * Event Validation Middleware
 * Business rule validation for game events
 */

import { getGamesContainer, getRostersContainer } from './cosmosClient.js';

/**
 * Validate goal event data
 */
export async function validateGoalEvent(goalData) {
  const errors = [];

  // Required fields validation
  const required = ['gameId', 'teamName', 'playerName', 'period', 'timeRemaining'];
  for (const field of required) {
    if (!goalData[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Period validation
  if (goalData.period && (goalData.period < 1 || goalData.period > 3)) {
    errors.push('Period must be between 1 and 3');
  }

  // Time format validation
  if (goalData.timeRemaining) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(goalData.timeRemaining)) {
      errors.push('Time remaining must be in MM:SS format');
    }
  }

  // Game existence validation
  if (goalData.gameId) {
    try {
      const gamesContainer = getGamesContainer();
      const gameQuery = {
        query: 'SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: goalData.gameId }]
      };
      const { resources: games } = await gamesContainer.items.query(gameQuery).fetchAll();

      if (games.length === 0) {
        errors.push('Game not found');
      } else {
        const game = games[0];
        // Validate team is in the game
        if (goalData.teamName && goalData.teamName !== game.homeTeam && goalData.teamName !== game.awayTeam) {
          errors.push('Team is not participating in this game');
        }
      }
    } catch (error) {
      errors.push('Error validating game: ' + error.message);
    }
  }

  // Player validation against roster
  if (goalData.teamName && goalData.playerName) {
    try {
      const rostersContainer = getRostersContainer();
      const rosterQuery = {
        query: 'SELECT * FROM c WHERE c.teamName = @teamName',
        parameters: [{ name: '@teamName', value: goalData.teamName }]
      };
      const { resources: rosters } = await rostersContainer.items.query(rosterQuery).fetchAll();

      if (rosters.length > 0) {
        const roster = rosters[0];
        const playerExists = roster.players.some(p => p.name === goalData.playerName);
        if (!playerExists) {
          errors.push('Player is not on the team roster');
        }
      }
    } catch (error) {
      // Don't fail validation if roster check fails, just log
      console.warn('Could not validate player against roster:', error.message);
    }
  }

  return errors;
}

/**
 * Validate penalty event data
 */
export async function validatePenaltyEvent(penaltyData) {
  const errors = [];

  // Required fields validation
  const required = ['gameId', 'teamName', 'playerName', 'period', 'timeRemaining', 'penaltyType', 'length'];
  for (const field of required) {
    if (!penaltyData[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Period validation
  if (penaltyData.period && (penaltyData.period < 1 || penaltyData.period > 3)) {
    errors.push('Period must be between 1 and 3');
  }

  // Time format validation
  if (penaltyData.timeRemaining) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(penaltyData.timeRemaining)) {
      errors.push('Time remaining must be in MM:SS format');
    }
  }

  // Penalty length validation
  if (penaltyData.length && (penaltyData.length < 1 || penaltyData.length > 10)) {
    errors.push('Penalty length must be between 1 and 10 minutes');
  }

  // Game existence validation
  if (penaltyData.gameId) {
    try {
      const gamesContainer = getGamesContainer();
      const gameQuery = {
        query: 'SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: penaltyData.gameId }]
      };
      const { resources: games } = await gamesContainer.items.query(gameQuery).fetchAll();

      if (games.length === 0) {
        errors.push('Game not found');
      } else {
        const game = games[0];
        // Validate team is in the game
        if (penaltyData.teamName && penaltyData.teamName !== game.homeTeam && penaltyData.teamName !== game.awayTeam) {
          errors.push('Team is not participating in this game');
        }
      }
    } catch (error) {
      errors.push('Error validating game: ' + error.message);
    }
  }

  // Player validation against roster
  if (penaltyData.teamName && penaltyData.playerName) {
    try {
      const rostersContainer = getRostersContainer();
      const rosterQuery = {
        query: 'SELECT * FROM c WHERE c.teamName = @teamName',
        parameters: [{ name: '@teamName', value: penaltyData.teamName }]
      };
      const { resources: rosters } = await rostersContainer.items.query(rosterQuery).fetchAll();

      if (rosters.length > 0) {
        const roster = rosters[0];
        const playerExists = roster.players.some(p => p.name === penaltyData.playerName);
        if (!playerExists) {
          errors.push('Player is not on the team roster');
        }
      }
    } catch (error) {
      // Don't fail validation if roster check fails, just log
      console.warn('Could not validate player against roster:', error.message);
    }
  }

  return errors;
}

/**
 * Validate roster data
 */
export function validateRosterData(rosterData) {
  const errors = [];

  // Required fields validation
  const required = ['teamName', 'season', 'division', 'players'];
  for (const field of required) {
    if (!rosterData[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Players array validation
  if (rosterData.players && Array.isArray(rosterData.players)) {
    rosterData.players.forEach((player, index) => {
      if (!player.name) {
        errors.push(`Player ${index + 1}: Missing name`);
      }
      if (!player.firstName || !player.lastName) {
        errors.push(`Player ${index + 1}: Missing firstName or lastName`);
      }
      if (player.jerseyNumber && (player.jerseyNumber < 0 || player.jerseyNumber > 99)) {
        errors.push(`Player ${index + 1}: Invalid jersey number`);
      }
    });
  } else if (rosterData.players) {
    errors.push('Players must be an array');
  }

  return errors;
}

/**
 * Generate next sequence number for game events
 */
export async function getNextSequenceNumber(gameId) {
  try {
    const goalsContainer = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();

    // Get max sequence number from goals
    const goalsQuery = {
      query: 'SELECT VALUE MAX(c.sequenceNumber) FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: goalsMax } = await goalsContainer.items.query(goalsQuery).fetchAll();
    const maxGoalsSeq = goalsMax[0] || 0;

    // Get max sequence number from penalties
    const penaltiesQuery = {
      query: 'SELECT VALUE MAX(c.sequenceNumber) FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: penaltiesMax } = await penaltiesContainer.items.query(penaltiesQuery).fetchAll();
    const maxPenaltiesSeq = penaltiesMax[0] || 0;

    return Math.max(maxGoalsSeq, maxPenaltiesSeq) + 1;
  } catch (error) {
    console.warn('Error getting next sequence number:', error.message);
    return 1; // Default to 1 if we can't determine
  }
}

/**
 * Generate player ID
 */
export function generatePlayerId(teamName, playerName) {
  const cleanTeam = teamName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const cleanPlayer = playerName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `${cleanTeam}_${cleanPlayer}_${Date.now().toString(36)}`;
}
