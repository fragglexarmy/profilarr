# Unified Release Title Parser - C# Microservice

Parser microservice for release title parsing, using native .NET regex for exact Radarr/Sonarr parity.

---

## Goal

Enable testing of custom format conditions against release titles without requiring a connected arr instance. Uses a C# microservice with regex patterns copied directly from Radarr/Sonarr source.

---

## Architecture

```
┌─────────────────┐     HTTP      ┌─────────────────────┐
│                 │    POST       │                     │
│  Profilarr UI   │ ───────────>  │  Parser Service     │
│  (SvelteKit)    │   /parse      │  (C# / .NET 8)      │
│                 │ <───────────  │                     │
└─────────────────┘    JSON       └─────────────────────┘
```

**Why C# microservice?**
- Native .NET regex - exact parity with Radarr/Sonarr
- Copy parser classes verbatim from source
- Fast (~1-5ms per parse)
- Easy to sync with upstream changes

---

## Current Status

### Completed (Phase 1-6)

- [x] C# microservice scaffolded (`services/parser/`)
- [x] QualityParser ported from Radarr
- [x] TypeScript client in Profilarr
- [x] Config for `PARSER_HOST` / `PARSER_PORT`
- [x] LanguageParser ported from Radarr (58 languages supported)
- [x] ReleaseGroupParser ported from Radarr
- [x] TitleParser ported from Radarr (title, year, edition, IMDB/TMDB IDs)
- [x] EpisodeParser ported from Sonarr (ReleaseType, season/episode detection)

### Remaining (Phase 7+)

- [ ] Custom format testing UI integration

---

## File Structure

### C# Microservice

```
services/parser/
├── Parser.csproj
├── Program.cs              # Minimal API (POST /parse, GET /health)
├── Dockerfile
├── docker-compose.yml      # Standalone docker compose
└── Core/
    ├── Types.cs            # QualitySource, Resolution, QualityModifier enums
    ├── Language.cs         # Language enum (58 languages)
    ├── RegexReplace.cs     # Helper for regex replacement
    ├── ParserCommon.cs     # Shared regex patterns
    ├── QualityParser.cs    # Ported from Radarr (regex + decision tree)
    ├── LanguageParser.cs   # Ported from Radarr (language detection)
    ├── ReleaseGroupParser.cs # Ported from Radarr (release group extraction)
    ├── TitleParser.cs      # Ported from Radarr (title, year, edition, IDs)
    └── EpisodeParser.cs    # Ported from Sonarr (season/episode, ReleaseType)
```

### TypeScript Client

```
src/lib/server/utils/arr/parser/
├── index.ts       # Exports
├── types.ts       # Matching TypeScript enums
└── client.ts      # HTTP client (uses config.parserUrl)
```

### Configuration

```
src/lib/server/utils/config/config.ts
```

Environment variables:
- `PARSER_HOST` (default: `localhost`)
- `PARSER_PORT` (default: `5000`)

---

## API

### POST /parse

Request:
```json
{ "title": "Movie.Name.2024.1080p.BluRay.REMUX-GROUP" }
```

Response (movie):
```json
{
  "title": "Movie.Name.2024.1080p.BluRay.REMUX-GROUP",
  "source": "Bluray",
  "resolution": 1080,
  "modifier": "Remux",
  "revision": {
    "version": 1,
    "real": 0,
    "isRepack": false
  },
  "languages": ["Unknown"],
  "releaseGroup": "GROUP",
  "movieTitles": ["Movie Name"],
  "year": 2024,
  "edition": null,
  "imdbId": null,
  "tmdbId": 0,
  "hardcodedSubs": null,
  "releaseHash": null,
  "episode": null
}
```

Response (TV series):
```json
{
  "title": "Show.Name.S01E05.Episode.Title.1080p.WEB-DL-GROUP",
  "source": "WebDL",
  "resolution": 1080,
  "modifier": "None",
  "revision": { "version": 1, "real": 0, "isRepack": false },
  "languages": ["Unknown"],
  "releaseGroup": "GROUP",
  "movieTitles": [],
  "year": 0,
  "edition": null,
  "imdbId": null,
  "tmdbId": 0,
  "hardcodedSubs": null,
  "releaseHash": null,
  "episode": {
    "seriesTitle": "Show Name",
    "seasonNumber": 1,
    "episodeNumbers": [5],
    "absoluteEpisodeNumbers": [],
    "airDate": null,
    "fullSeason": false,
    "isPartialSeason": false,
    "isMultiSeason": false,
    "isMiniSeries": false,
    "special": false,
    "releaseType": "SingleEpisode"
  }
}
```

### GET /health

Response:
```json
{ "status": "healthy" }
```

---

## Enums

### QualitySource
```csharp
Unknown, Cam, Telesync, Telecine, Workprint, DVD, TV, WebDL, WebRip, Bluray
```

### Resolution
```csharp
Unknown = 0, R360p = 360, R480p = 480, R540p = 540, R576p = 576,
R720p = 720, R1080p = 1080, R2160p = 2160
```

### QualityModifier
```csharp
None, Regional, Screener, RawHD, BRDisk, Remux
```

### ReleaseType
```csharp
Unknown, SingleEpisode, MultiEpisode, SeasonPack
```

### Language (58 supported)
```csharp
Unknown, English, French, Spanish, German, Italian, Danish, Dutch, Japanese,
Icelandic, Chinese, Russian, Polish, Vietnamese, Swedish, Norwegian, Finnish,
Turkish, Portuguese, Flemish, Greek, Korean, Hungarian, Hebrew, Lithuanian,
Czech, Hindi, Romanian, Thai, Bulgarian, PortugueseBR, Arabic, Ukrainian,
Persian, Bengali, Slovak, Latvian, SpanishLatino, Catalan, Croatian, Serbian,
Bosnian, Estonian, Tamil, Indonesian, Telugu, Macedonian, Slovenian, Malayalam,
Kannada, Albanian, Afrikaans, Marathi, Tagalog, Urdu, Romansh, Mongolian,
Georgian, Original
```

---

## Running the Service

### Local Development

```bash
cd services/parser
dotnet run
```

### Docker

```bash
docker build -t profilarr-parser services/parser
docker run -p 5000:5000 profilarr-parser
```

### Docker Compose (standalone)

```bash
cd services/parser
docker compose up -d
```

This uses the `services/parser/docker-compose.yml` which builds and runs the parser service.

### Docker Compose (integrate with Profilarr)

Add to your main docker-compose:

```yaml
services:
  parser:
    build: ./services/parser
    ports:
      - "5000:5000"
```

Set in Profilarr environment:
```
PARSER_HOST=parser
PARSER_PORT=5000
```

---

## Source Reference

Radarr parser source (cloned to `dist/parser-research/Radarr/`):

| File | Purpose | Status |
|------|---------|--------|
| `QualityParser.cs` | Source, resolution, modifier detection | ✅ Ported |
| `LanguageParser.cs` | Language detection (58 languages) | ✅ Ported |
| `ReleaseGroupParser.cs` | Release group extraction | ✅ Ported |
| `Parser.cs` | Title/year/edition extraction | ✅ Ported |

Sonarr additions (cloned to `dist/parser-research/Sonarr/`):

| File | Purpose | Status |
|------|---------|--------|
| `Parser.cs` | Episode/season detection (40+ regex patterns) | ✅ Ported |
| `Model/ReleaseType.cs` | SingleEpisode, MultiEpisode, SeasonPack | ✅ Ported |
| `Model/ParsedEpisodeInfo.cs` | Episode info structure | ✅ Ported |

---

## Next Steps

1. **UI integration** - Custom format testing component

---

## Maintenance

To sync with upstream Radarr/Sonarr changes:

```bash
cd dist/parser-research/Radarr
git pull
git diff HEAD~50 src/NzbDrone.Core/Parser/

cd dist/parser-research/Sonarr
git pull
git diff HEAD~50 src/NzbDrone.Core/Parser/
```

Copy updated regex patterns and logic to `services/parser/Core/`.
