# Daily Metrics Runner

A TypeScript-based daily metrics processor using Drizzle ORM for type-safe database operations and modern Node.js architecture.

## Features

- **Type Safety**: Full TypeScript support with Drizzle ORM
- **Automated Daily Execution**: Runs metrics processing daily at 2:00 AM UTC
- **Robust Error Handling**: Comprehensive error handling and logging
- **Flexible Configuration**: Environment-based database configuration
- **Manual Execution**: Can be run once manually for testing
- **Modern Architecture**: Clean separation of concerns with proper abstractions

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Database Configuration

Create a `.env` file in the project root with your database credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password

# Optional: Set to production/staging/development
ENVIRONMENT=development
```

### 3. Build the Project

```bash
yarn build
```

## Usage

### Development Mode

```bash
# Run once for testing
yarn once

# Run in development mode
yarn dev
```

### Production Mode

```bash
# Run once
yarn start -- --once

# Run on schedule
yarn start
```

### Using System Cron (Alternative)

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2:00 AM UTC
0 2 * * * cd /path/to/your/project && yarn start -- --once
```

## What It Does

The script processes metrics using TypeScript and Drizzle ORM to calculate:

### Global Metrics (stored in `daily_metrics` table):

- Total participants (cumulative)
- New participants (daily)
- Registered participants
- Meeting counts by state
- Total meetings
- Newsletter opt-ins/opt-outs with percentages
- Dashboard usage metrics

### Event-Specific Metrics (stored in `event_metrics` table):

- Per-event participant counts
- Per-event meeting counts by state
- Meeting acceptance rates
- Matchmaking signup rates

### Participant-Specific Metrics (stored in `participant_metrics` table):

- Per-participant meeting counts by state
- Per-participant total meetings

## Architecture

### Key Components:

- **`src/schema.ts`**: Drizzle schema definitions with full type safety
- **`src/database.ts`**: Database connection management
- **`src/metrics-processor.ts`**: Core metrics calculation logic
- **`src/metrics-runner.ts`**: Scheduling and execution management
- **`src/index.ts`**: Application entry point

### Type Safety Benefits:

- **Compile-time validation**: Catch errors before runtime
- **IntelliSense support**: Full autocomplete for database queries
- **Refactoring safety**: Rename fields safely across codebase
- **Type inference**: Automatic type inference from database schema

## Error Handling

The application includes comprehensive error handling:

- Database connection failures
- Query execution errors
- Configuration validation
- Graceful shutdown on interruption
- Unhandled promise rejection handling

## Monitoring

The application provides detailed console output with emojis for easy monitoring:

- 🚀 Application startup
- 📊 Metrics calculation progress
- 💾 Database operations
- ✅ Success indicators
- ❌ Error indicators
- 🎉 Completion celebrations

## Development

### Available Scripts:

- `yarn build`: Compile TypeScript to JavaScript
- `yarn dev`: Run in development mode with tsx
- `yarn once`: Run once for testing
- `yarn type-check`: Type check without compilation

### Type Checking:

The project uses strict TypeScript configuration with:

- Strict null checks
- No implicit any
- No unused variables/parameters
- Exact optional property types

## Performance

TypeScript + Drizzle provides:

- **Faster execution**: Node.js optimized for I/O operations
- **Better memory management**: More efficient than Python
- **Concurrent processing**: Better async/await patterns
- **Type-safe queries**: Compile-time query validation
