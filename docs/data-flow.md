# JSON Data Flow Documentation

## Overview

The Scorekeeper application uses JSON files as its primary persistence layer for GitHub Pages deployment. This document outlines the data flow, naming conventions, schema definitions, and operational workflows.

## Data Architecture

### Storage Location
- **Primary**: `public/data/` - Static JSON files served by GitHub Pages
- **Backup**: Browser LocalStorage for user preferences and temporary data
- **Cache**: In-memory caching for frequently accessed data

### File Structure
```
public/data/
├── games.json          # All game records
├── players.json        # Player statistics and profiles
├── teams.json          # Team rosters and information
└── summary.json        # Dashboard summaries and aggregates
```

## Naming Conventions

### Game Files (Future Implementation)
Individual game files follow the deterministic naming pattern:
```
YYYYMMDD_game-<league>-<id>.json
```

**Examples:**
- `20250115_game-a-001.json` - January 15, 2025, Division A, Game 1
- `20250220_game-b-012.json` - February 20, 2025, Division B, Game 12

### ID Formats

#### Game IDs
```
YYYYMMDD_<league>_<sequentialId>
```
- `YYYYMMDD`: Date in YYYYMMDD format
- `<league>`: Lowercase league/division identifier (a, b, bronze, etc.)
- `<sequentialId>`: Zero-padded 3-digit sequential number

#### Entity IDs
- **Goals**: `goal_YYYYMMDD_<sequentialId>`
- **Penalties**: `penalty_YYYYMMDD_<sequentialId>`
- **Attendance**: `attendance_YYYYMMDD_<sequentialId>`
- **Player Stats**: `stats_YYYYMMDD_<sequentialId>`

## Schema Definitions

### Core Schemas

#### Games Schema
```json
{
  "id": "string (required)",
  "homeTeam": "string (required)",
  "awayTeam": "string (required)",
  "gameDate": "string (required)", // YYYY-MM-DD
  "gameTime": "string (required)", // HH:MM
  "division": "string (required)",
  "season": "string (required)",
  "year": "number (required)",
  "status": "string (default: 'Scheduled')",
  "homeTeamGoals": "number (default: 0)",
  "awayTeamGoals": "number (default: 0)",
  "createdAt": "string (required)", // ISO string
  "updatedAt": "string (required)"  // ISO string
}
```

#### Goals Schema
```json
{
  "id": "string (required)",
  "gameId": "string (required)",
  "teamName": "string (required)",
  "playerName": "string (required)",
  "period": "number (required)",
  "time": "string (required)", // MM:SS
  "assist1": "string (optional)",
  "assist2": "string (optional)",
  "shotType": "string (optional)",
  "goalType": "string (optional)",
  "createdAt": "string (required)"
}
```

#### Penalties Schema
```json
{
  "id": "string (required)",
  "gameId": "string (required)",
  "teamName": "string (required)",
  "playerName": "string (required)",
  "penaltyType": "string (required)",
  "period": "number (required)",
  "time": "string (required)", // MM:SS
  "duration": "number (default: 2)",
  "severity": "string (optional)",
  "createdAt": "string (required)"
}
```

#### Attendance Schema
```json
{
  "id": "string (required)",
  "gameId": "string (required)",
  "teamName": "string (required)",
  "playersPresent": "array (required)",
  "totalRosterSize": "number (optional)",
  "createdAt": "string (required)"
}
```

#### Player Stats Schema
```json
{
  "id": "string (required)",
  "gameId": "string (required)",
  "teamName": "string (required)",
  "playerName": "string (required)",
  "goals": "number (default: 0)",
  "assists": "number (default: 0)",
  "points": "number (default: 0)",
  "penaltyMinutes": "number (default: 0)",
  "shots": "number (default: 0)",
  "createdAt": "string (required)"
}
```

## Operator Workflow

### Pre-Game Setup
1. **Schedule Import**: Import game schedules from CSV/Excel
2. **Roster Verification**: Confirm team rosters are up-to-date
3. **Data Validation**: Run schema validation on all JSON files
4. **Backup Creation**: Create timestamped backups before game day

### During Game
1. **Real-time Updates**: Record goals, penalties, and stats as they occur
2. **Data Integrity**: Validate each entry against schema before saving
3. **Cache Management**: Update in-memory caches for performance
4. **Error Handling**: Log validation errors and alert operators

### Post-Game
1. **Data Export**: Generate game-specific JSON files with deterministic names
2. **Summary Updates**: Update dashboard summaries and statistics
3. **Archive Creation**: Move completed games to archive with proper naming
4. **Validation**: Run comprehensive validation on all modified files

### Maintenance
1. **Weekly Audits**: Check for schema compliance and data integrity
2. **Security Scans**: Audit JSON files for sensitive data exposure
3. **Performance Monitoring**: Monitor file sizes and load times
4. **Backup Verification**: Ensure backups are complete and accessible

## Schema Versioning

### Version Format
```
v<major>.<minor>.<patch>-<date>
```
- **Major**: Breaking schema changes
- **Minor**: New optional fields or backward-compatible changes
- **Patch**: Bug fixes, documentation updates
- **Date**: YYYYMMDD format

### Migration Strategy
1. **Backward Compatibility**: New versions must support old data
2. **Migration Scripts**: Provide automated migration for major versions
3. **Documentation**: Update this document with migration guides
4. **Testing**: Validate migrations with sample data

### Current Version
**v1.0.0-20250115**
- Initial schema definitions
- Basic validation rules
- Deterministic naming conventions

## Security Considerations

### Data Protection
- **No Secrets**: JSON files must never contain API keys, passwords, or tokens
- **Access Control**: GitHub repository access controls apply
- **Audit Trail**: All changes tracked via Git history
- **Encryption**: Sensitive configuration stored separately

### Validation Rules
- **Schema Compliance**: All data must match defined schemas
- **Type Safety**: Strict type checking for all fields
- **Required Fields**: Mandatory fields cannot be null/undefined
- **Sanitization**: Input data sanitized before storage

## Performance Optimization

### Caching Strategy
- **Browser Cache**: Leverage HTTP caching for static files
- **Memory Cache**: Cache frequently accessed data in memory
- **Lazy Loading**: Load data only when needed
- **Compression**: Consider gzip compression for large files

### File Size Management
- **Pagination**: Split large datasets across multiple files
- **Archiving**: Move old data to compressed archives
- **Cleanup**: Remove temporary and duplicate files
- **Monitoring**: Track file sizes and growth patterns

## Error Handling

### Validation Errors
- **Schema Violations**: Log detailed error messages
- **Data Corruption**: Implement recovery mechanisms
- **Network Failures**: Graceful degradation with cached data
- **User Feedback**: Clear error messages for operators

### Recovery Procedures
1. **Data Backup**: Regular automated backups
2. **Version Control**: Git-based recovery options
3. **Manual Override**: Emergency procedures for critical data
4. **Audit Logs**: Track all data modifications

## Tools and Utilities

### Development Tools
- **Schema Validator**: `backend/src/utils/jsonDataUtils.js`
- **Sample Generator**: Automated sample data creation
- **Migration Scripts**: Version upgrade utilities
- **Audit Tools**: Security and integrity scanners

### Monitoring
- **File Size Tracking**: Monitor JSON file sizes
- **Load Time Metrics**: Track data loading performance
- **Error Rate Monitoring**: Alert on validation failures
- **Usage Analytics**: Track data access patterns

## Future Enhancements

### Planned Features
- **Individual Game Files**: Migrate to per-game JSON files
- **Real-time Sync**: WebSocket-based live updates
- **Advanced Analytics**: Enhanced statistics and reporting
- **Mobile App**: Native mobile application support

### Schema Extensions
- **Game Events**: Detailed play-by-play data
- **Player Tracking**: Advanced player performance metrics
- **Team Analytics**: Comprehensive team statistics
- **Historical Data**: Long-term trend analysis