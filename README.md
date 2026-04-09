# Code Scout API
An API designed for fast responses, lightweight performance, and 24/7 availability.
## API Endpoints

All responses are returned as UTF-8 JSON.
- `URL ` - https://codescoutapi.onrender.com/
- `GET /` - service metadata
- `GET /search?q=<query>&limit=<number>` - search game slugs
- `GET /codes/:slug` - fetch codes for a game slug

## API Route Responses

### Search Route Response
- `GET /search?q=<query>&limit=<number>` - search game slugs


```js
const axios = require("axios");

async function search(slug, limit) {
  try {
    const res = await axios.get(`https://codescoutapi.onrender.com/search?q=${slug}&limit=${limit}`);
    return res.data;
  } catch (e) {
    return { error: e.message };
  }
}

(async () => {
  console.log(await search("bloxfruit", 5));
})();
```

```json
[
  {
    "title": "Blox Fruits Codes (April 2026)",
    "slug": "blox-fruits"
  },
  {
    "title": "Fruit Battlegrounds Codes (April 2026)",
    "slug": "fruit-battlegrounds"
  }
]
```

### Codes Route Response
- `GET /search?q=<query>&limit=<number>` - search game slugs
```js
const axios = require("axios");

async function search(slug) {
  try {
    const res = await axios.get(`https://codescoutapi.onrender.com/codes/${slug}`);
    return res.data;
  } catch (e) {
    if (e.response?.status === 404) {
      return e.response.data; 
    }
    return { error: e.message };
  }
}

(async () => {
  console.log(await search("blox-fruit"));
})();
```

```json
{
  "message": "OK",
  "status": 200,
  "activeCodes": [
    {
      "code": "SUBFORX2",
      "description": "2x XP boost",
      "isNew": true
    }
  ],
  "expiredCodes": [
    {
      "code": "OLDCODE1"
    }
  ]
}
```

## Curl Res

### Search

```bash
curl -s "http://localhost:3000/search?q=fruit&limit=5" | jq
```

### Fetch codes

```bash
curl -s "http://localhost:3000/codes/pickaxe-simulator" | jq
```

# Code Scout Library

A lightweight Node.js library for scraping and managing Roblox game codes from beebom.com with persistent caching, request tracking, and intelligent search.

## Features

- **Smart Caching**: Optional in memory caching with configurable TTL to reduce requests and improve response times
- **Persistent Request Tracking**: Built-in statistics logging tracks request counts per game slug with timestamps
- **Automatic Updates**: Configurable auto-update mechanism based on request thresholds to keep game data fresh
- **Fuzzy Search**: Search through 10+ similar game titles with a single query using Fuse.js
- **Code Retrieval**: Extract active and expired codes for any game with intelligent fallback suggestions
- **Zero Configuration**: Works out of the box with sensible defaults

## Installation

```bash
npm install axios cheerio fuse.js
```

### Dependencies

- **axios** - HTTP client for fetching website content
- **cheerio** - HTML parser for web scraping game codes from beebom.com
- **fuse.js** - Fuzzy search library for intelligent query matching

## Quick Start

### With Caching (Recommended)

```javascript
const robloxCode = require('./main.js');

const api = new robloxCode({
    cache: true,
    ttl: 300000,
    updateInterval: 100,
});

async function run() {
    // Update game list once
    const updateResult = await api.update();
    console.log(updateResult);
    
    // Fetch codes for a specific game
    const codes = await api.getCodeof('blox-fruits');
    console.log(codes);

    // Search for games by title
    const results = await api.search("fruit");
    console.log(results);
}

run();
```

### Without Caching

```javascript
const api = new robloxCode();

const codes = await api.getCodeof('blox-fruits');
```

## Configuration

### Option: `cache`
Type: `boolean` | Default: `false`

Enable persistent caching to store fetched codes. Creates a `cache/` directory to store data.

### Option: `ttl`
Type: `number` | Default: `300000` (5 minutes)

Cache duration in milliseconds. Determines how long cached responses are valid before requiring a fresh fetch.

### Option: `updateInterval`
Type: `number` | Default: `100`

Number of requests before automatically calling `update()` to refresh the game list. Set to `null` to disable auto-updates.

## API Reference

### `update()`

Scrapes beebom.com and refreshes the complete game list. Stores results in `cache/data.json`.

```javascript
const result = await api.update();
console.log(result);
```

Response:
```json
{
  "message": "Articles updated successfully",
  "total": 857
}
```

### `getCodeof(slug)`

Fetches active and expired codes for a specific game. Returns suggestions if the game is not found.

```javascript
const codes = await api.getCodeof('blox-fruits');
```

Success Response:
```json
{
  "message": "OK",
  "status": 200,
  "activeCodes": [
    {
      "code": "SUBFORX2",
      "description": "2x XP boost",
      "isNew": true
    },
    {
      "code": "FRUITPOWER",
      "description": "New trait unlock",
      "isNew": false
    }
  ],
  "expiredCodes": [
    { "code": "OLDCODE1" },
    { "code": "OLDCODE2" }
  ]
}
```

Not Found Response (with suggestions):
```json
{
  "message": "No codes found for \"blox-fruit\"",
  "status": 404,
  "suggestions": [
    "blox-fruits",
    "fruit-battlegrounds",
    "fruit-defenders"
  ]
}
```

### `search(query, limit)`

Searches for games using fuzzy matching. Returns up to 10 results by default.

**Parameters:**
- `query` (string) - Search term matching game titles or slugs
- `limit` (number, optional) - Maximum results to return (default: 10)

```javascript
const results = await api.search('fruit', 5);
```

Search Response:
```json
[
  {
    "title": "Blox Fruits Codes (April 2026)",
    "slug": "blox-fruits"
  },
  {
    "title": "Fruit Battlegrounds Codes (April 2026)",
    "slug": "fruit-battlegrounds"
  },
  {
    "title": "Fruit Defenders Codes (April 2026)",
    "slug": "fruit-defenders"
  },
  {
    "title": "One Fruit Simulator Codes (March 2026)",
    "slug": "one-fruit-simulator"
  },
  {
    "title": "Fruit Seas Codes (February 2026)",
    "slug": "fruit-seas"
  }
]
```

## Statistics & Logging

Request counts are automatically logged to `cache/stat.json`:

```json
{
  "requests": 42,
  "blox-fruits": {
    "request": 12,
    "_ts": "2026-04-09T15:30:45.123Z"
  },
  "fruit-battlegrounds": {
    "request": 8,
    "_ts": "2026-04-09T14:22:10.456Z"
  }
}
```

- `requests`: Total API calls across all games
- Per-game counters persist across application restarts
- Used by `updateInterval` to trigger automatic data refreshes

## File Structure

```
cache/
├── code.json       # Cached code responses (TTL-based)
├── data.json       # Game article list
└── stat.json       # Request statistics and counters
```

## How It Works

1. **First Run**: Auto-downloads full game list on first code request
2. **Caching**: Stores fetched codes with timestamps for faster responses
3. **Auto-Update**: Refreshes game list every N requests to catch newly added games
4. **Smart Search**: Uses fuzzy matching to suggest similar games on typos
5. **Persistent Stats**: Tracks requests across restarts for accurate throttling prevention

## Complete Example

```javascript
const robloxCode = require('./main.js');

// Initialize with caching enabled
const api = new robloxCode({
    cache: true,
    ttl: 600000,          // 10 min cache
    updateInterval: 50,   // Update every 50 requests
});

async function main() {
    try {
        // Option 1: Search for games
        const games = await api.search('simulator');
        console.log('Found games:', games);

        // Option 2: Get codes for a specific game
        const codes = await api.getCodeof('blox-fruits');
        console.log('Active codes:', codes.activeCodes);
        console.log('Expired codes:', codes.expiredCodes);

        // Option 3: Manually update game list
        const update = await api.update();
        console.log('Updated:', update.total, 'games');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
```

## Notes

- All methods are async and should be awaited
- Requires active internet connection for web scraping
- beebom.com structure changes may require scraper updates
- Statistics persist in `cache/stat.json` even if application restarts

