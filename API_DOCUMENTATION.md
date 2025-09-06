# API Documentation

## Overview

The Hockey Scorekeeper API provides enterprise-grade endpoints for managing hockey game data, rosters, statistics, and real-time announcements. This API follows REST principles and implements standardized response formats, comprehensive validation, and performance monitoring.

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3001/api
```

## Authentication

Currently, the API uses IP-based rate limiting. Future versions will implement JWT-based authentication.

## Rate Limiting

- **Production**: 100 requests per 15-minute window per IP
- **Development**: No rate limiting

## Standard Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "requestId": "req_1705320600_abc123",
    "count": 10,
    // Additional metadata
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["Field 'homeTeam' is required"]
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "requestId": "req_1705320600_abc123"
  }
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

## Endpoints

### Health Check

#### GET /health
Get system health status and performance metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "message": "Hockey Scorekeeper API is running in healthy mode",
    "uptime": "2h 15m 30s",
    "version": "1.2.3",
    "environment": "production",
    "services": {
      "database": {
        "available": true,
        "status": "connected"
      },
      "tts": {
        "available": true,
        "provider": "google-cloud"
      }
    },
    "performance": {
      "requests": {
        "total": 1250,
        "last5Minutes": 45,
        "avgResponseTime": 120,
        "errorRate": 0.02
      },
      "memory": {
        "used": 512,
        "total": 1024
      }
    },
    "alerts": []
  }
}
```

### Games

#### GET /games
Get games with optional filtering.

**Query Parameters:**
- `division` (string): Filter by division ('all', 'Tier 1', 'Tier 2', etc.)
- `gameId` (string): Get specific game by ID
- `dateFrom` (string): Start date filter (ISO 8601)
- `dateTo` (string): End date filter (ISO 8601)
- `includeUpcoming` (boolean): Include upcoming games (today + 6 days)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "fall_2025_team_a_vs_team_b_1705320600",
      "homeTeam": "Team A",
      "awayTeam": "Team B",
      "gameDate": "2025-01-15",
      "gameTime": "19:00",
      "division": "Tier 1",
      "season": "Fall",
      "year": 2025,
      "status": "scheduled",
      "venue": "Rink 1",
      "createdAt": "2025-01-10T10:00:00.000Z",
      "updatedAt": "2025-01-10T10:00:00.000Z"
    }
  ],
  "meta": {
    "count": 1,
    "division": "Tier 1",
    "filters": ["division", "dateFrom"]
  }
}
```

#### POST /games
Create a new game.

**Request Body:**
```json
{
  "homeTeam": "Team A",
  "awayTeam": "Team B",
  "gameDate": "2025-01-15",
  "gameTime": "19:00",
  "division": "Tier 1",
  "season": "Fall",
  "year": 2025,
  "venue": "Rink 1"
}
```

**Response:** 201 Created with game object

#### GET /games/:id
Get a specific game by ID.

**Response:** Game object or 404 if not found

#### PUT /games/:id
Update a game.

**Request Body:** Partial game object with fields to update

**Response:** Updated game object

#### DELETE /games/:id
Delete a game.

**Response:** Success confirmation

### Rosters

#### GET /rosters
Get team rosters with optional filtering.

**Query Parameters:**
- `teamName` (string): Filter by team name
- `division` (string): Filter by division
- `season` (string): Filter by season
- `year` (number): Filter by year

#### POST /rosters
Create a new roster.

**Request Body:**
```json
{
  "teamName": "Team A",
  "division": "Tier 1",
  "season": "Fall",
  "year": 2025,
  "players": [
    {
      "playerName": "John Doe",
      "jerseyNumber": 10,
      "position": "F"
    }
  ]
}
```

### Statistics

#### GET /goals
Get goal records.

#### POST /goals
Record a goal.

#### GET /penalties
Get penalty records.

#### POST /penalties
Record a penalty.

## Data Models

### Game Schema
```json
{
  "id": "string (auto-generated)",
  "homeTeam": "string (required)",
  "awayTeam": "string (required)",
  "gameDate": "string (YYYY-MM-DD, required)",
  "gameTime": "string (HH:MM, required)",
  "division": "enum (required) ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Unknown']",
  "season": "enum (required) ['Fall', 'Winter', 'Spring', 'Summer']",
  "year": "number (required)",
  "status": "enum ['scheduled', 'in_progress', 'completed', 'cancelled']",
  "venue": "string",
  "homeScore": "number (default: 0)",
  "awayScore": "number (default: 0)",
  "period": "number (default: 1)",
  "timeRemaining": "string",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

### Roster Schema
```json
{
  "id": "string (auto-generated)",
  "teamName": "string (required)",
  "division": "enum (required)",
  "season": "enum (required)",
  "year": "number (required)",
  "players": [
    {
      "playerName": "string (required)",
      "jerseyNumber": "number (required, unique within team)",
      "position": "enum ['F', 'D', 'G']"
    }
  ],
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

## Performance Considerations

### Caching
- Game queries are cached for 5 minutes
- Date-filtered queries are cached for 2 minutes
- Cache is automatically invalidated on data updates

### Rate Limiting
- Production environments enforce rate limiting
- Monitor the `X-Request-ID` header for request tracking

### Response Times
- Target response time: < 200ms for cached queries
- Target response time: < 500ms for database queries
- Alerts are triggered for responses > 1000ms

## Monitoring

### Health Endpoints
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed metrics (admin only)

### Request Tracking
All requests include:
- `X-Request-ID` header for tracing
- Performance metrics logging
- Error rate monitoring

## Development

### Environment Variables
```env
NODE_ENV=production
LOG_LEVEL=info
COSMOS_DB_URI=your_cosmos_uri
COSMOS_DB_KEY=your_cosmos_key
OPENAI_API_KEY=your_openai_key (optional)
```

### Validation
All input is automatically:
- Sanitized for XSS prevention
- Validated against schema definitions
- Checked for required fields and data types

### Error Handling
- All errors are logged with context
- Sensitive information is automatically redacted
- Stack traces are excluded in production responses
