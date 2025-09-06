import { describe, it, expect } from '@jest/globals';
import { validate, sanitizeInput } from '../src/utils/validation.js';

describe('Validation Utility', () => {
  describe('validate function', () => {
    describe('game validation', () => {
      it('should validate a complete game object', () => {
        const gameData = {
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          gameDate: '2025-01-15',
          gameTime: '19:00',
          division: 'Tier 1',
          season: 'Fall',
          year: 2025,
          status: 'scheduled'
        };

        const result = validate('game', gameData);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject game with missing required fields', () => {
        const gameData = {
          homeTeam: 'Team A'
          // Missing required fields
        };

        const result = validate('game', gameData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors).toContain('awayTeam is required');
      });

      it('should reject game with invalid division', () => {
        const gameData = {
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          gameDate: '2025-01-15',
          gameTime: '19:00',
          division: 'Invalid Division',
          season: 'Fall',
          year: 2025
        };

        const result = validate('game', gameData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('division'))).toBe(true);
      });

      it('should reject game with invalid date format', () => {
        const gameData = {
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          gameDate: 'invalid-date',
          gameTime: '19:00',
          division: 'Tier 1',
          season: 'Fall',
          year: 2025
        };

        const result = validate('game', gameData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('gameDate'))).toBe(true);
      });

      it('should reject game with same home and away team', () => {
        const gameData = {
          homeTeam: 'Team A',
          awayTeam: 'Team A',
          gameDate: '2025-01-15',
          gameTime: '19:00',
          division: 'Tier 1',
          season: 'Fall',
          year: 2025
        };

        const result = validate('game', gameData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('same team'))).toBe(true);
      });
    });

    describe('roster validation', () => {
      it('should validate a complete roster object', () => {
        const rosterData = {
          teamName: 'Team A',
          division: 'Tier 1',
          season: 'Fall',
          year: 2025,
          players: [
            {
              playerName: 'John Doe',
              jerseyNumber: 10,
              position: 'F'
            }
          ]
        };

        const result = validate('roster', rosterData);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject roster with duplicate jersey numbers', () => {
        const rosterData = {
          teamName: 'Team A',
          division: 'Tier 1',
          season: 'Fall',
          year: 2025,
          players: [
            { playerName: 'John Doe', jerseyNumber: 10, position: 'F' },
            { playerName: 'Jane Doe', jerseyNumber: 10, position: 'D' }
          ]
        };

        const result = validate('roster', rosterData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('duplicate jersey'))).toBe(true);
      });
    });

    describe('goal validation', () => {
      it('should validate a complete goal object', () => {
        const goalData = {
          gameId: 'game-123',
          playerName: 'John Doe',
          teamName: 'Team A',
          period: 1,
          timeInPeriod: '10:30',
          assistedBy: ['Jane Doe']
        };

        const result = validate('goal', goalData);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject goal with invalid period', () => {
        const goalData = {
          gameId: 'game-123',
          playerName: 'John Doe',
          teamName: 'Team A',
          period: 5, // Invalid period
          timeInPeriod: '10:30'
        };

        const result = validate('goal', goalData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('period'))).toBe(true);
      });
    });

    describe('penalty validation', () => {
      it('should validate a complete penalty object', () => {
        const penaltyData = {
          gameId: 'game-123',
          playerName: 'John Doe',
          teamName: 'Team A',
          penaltyType: 'Minor',
          infraction: 'Tripping',
          period: 1,
          timeInPeriod: '15:45',
          duration: 2
        };

        const result = validate('penalty', penaltyData);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject penalty with invalid duration for minor penalty', () => {
        const penaltyData = {
          gameId: 'game-123',
          playerName: 'John Doe',
          teamName: 'Team A',
          penaltyType: 'Minor',
          infraction: 'Tripping',
          period: 1,
          timeInPeriod: '15:45',
          duration: 5 // Invalid duration for minor penalty
        };

        const result = validate('penalty', penaltyData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('duration'))).toBe(true);
      });
    });

    it('should handle unknown validation type', () => {
      const result = validate('unknown', {});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown validation type: unknown');
    });

    it('should handle partial validation', () => {
      const partialGameData = {
        homeTeam: 'Team A',
        division: 'Tier 1'
      };

      const result = validate('game', partialGameData, { partial: true });
      
      // Partial validation should be less strict
      expect(result.isValid).toBe(true);
    });
  });

  describe('sanitizeInput function', () => {
    it('should sanitize string inputs', () => {
      const input = {
        name: '  John Doe  ',
        description: '<script>alert("xss")</script>Normal text',
        number: 123,
        nested: {
          value: '  nested value  '
        }
      };

      const result = sanitizeInput(input);
      
      expect(result.name).toBe('John Doe');
      expect(result.description).toBe('Normal text');
      expect(result.number).toBe(123);
      expect(result.nested.value).toBe('nested value');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['  tag1  ', '<script>tag2</script>', 'tag3']
      };

      const result = sanitizeInput(input);
      
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle null and undefined values', () => {
      const input = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: ''
      };

      const result = sanitizeInput(input);
      
      expect(result.nullValue).toBeNull();
      expect(result.undefinedValue).toBeUndefined();
      expect(result.emptyString).toBe('');
    });

    it('should not modify non-string types', () => {
      const input = {
        number: 123,
        boolean: true,
        date: new Date('2025-01-15')
      };

      const result = sanitizeInput(input);
      
      expect(result.number).toBe(123);
      expect(result.boolean).toBe(true);
      expect(result.date).toEqual(input.date);
    });
  });
});
