<table>
  <tr>
    <td><img src="src/lib/client/assets/logo-512.png" alt="Profilarr" width="128" height="128"></td>
    <td>
      <h1>Profilarr</h1>
      <p>
        <a href="https://github.com/Dictionarry-Hub/profilarr/releases"><img src="https://img.shields.io/github/v/release/Dictionarry-Hub/profilarr?color=blue" alt="GitHub release"></a>
        <a href="https://hub.docker.com/r/santiagosayshey/profilarr"><img src="https://img.shields.io/docker/pulls/santiagosayshey/profilarr?color=blue" alt="Docker Pulls"></a>
        <a href="https://github.com/Dictionarry-Hub/profilarr/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Dictionarry-Hub/profilarr?color=blue" alt="License"></a>
        <a href="https://dictionarry.dev/"><img src="https://img.shields.io/badge/Website-dictionarry.dev-blue" alt="Website"></a>
        <a href="https://discord.com/invite/Y9TYP6jeYZ"><img src="https://img.shields.io/discord/1202375791556431892?color=blue&logo=discord&logoColor=white" alt="Discord"></a>
        <a href="https://www.buymeacoffee.com/santiagosayshey"><img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-blue?logo=buy-me-a-coffee" alt="Buy Me A Coffee"></a>
        <a href="https://github.com/sponsors/Dictionarry-Hub"><img src="https://img.shields.io/badge/GitHub%20Sponsors-Support-blue?logo=github-sponsors" alt="GitHub Sponsors"></a>
      </p>
      <p>Manage quality profiles, custom formats, and release profiles across your Radarr and Sonarr instances. Define your profiles once with a Git-backed configuration database, then sync them to any number of \*arr instances.</p>
    </td>
  </tr>
</table>

## Features

**Core**

- **Link** - Connect to configuration databases like the
  [Dictionarry database](https://github.com/Dictionarry-Hub/db) or any Profilarr
  Compliant Database (PCD)
- **Bridge** - Add your Radarr and Sonarr instances by URL and API key
- **Sync** - Push configurations to your instances. Profilarr compiles
  everything to the right format automatically

**For Users**

- **Ready-to-Use Configurations** - Stop spending hours piecing together
  settings from forum posts. Get complete, tested quality profiles, custom
  formats, and media settings designed around specific goals
- **Stay Updated** - Make local tweaks that persist across upstream updates.
  View changelogs, diffs, and revert changes when needed. Merge conflicts are
  handled transparently
- **Automated Upgrades** - The arrs don't search for the best release, they grab
  the first RSS item that qualifies. Profilarr triggers intelligent searches
  based on filters and selectors

**For Developers**

- **Unified Architecture** - One configuration language that compiles to
  Radarr/Sonarr-specific formats on sync. No more maintaining separate configs
  for each app
- **Reusable Components** - Regular expressions are separate entities shared
  across custom formats. Change once, update everywhere
- **OSQL** - Configurations stored as append-only SQL operations. Readable,
  auditable, diffable. Git-native version control with complete history
- **Testing** - Validate regex patterns, custom format conditions, and quality
  profile behavior before syncing

## Documentation

See **[dictionarry.dev](https://dictionarry.dev/)** for complete installation,
usage, and API documenation.

## Getting Started

### Production

TODO:

- Deno binaries (Linux, macOS, Windows)
- Docker image build process
- Publishing to Docker Hub and ghcr.io
- Example `compose.yml`

> [!NOTE]
> The parser service is only required for custom format and quality profile
> testing. Linking, syncing, and all other features work without it.

### Development

**Prerequisites**

- [Deno](https://deno.com/) 2.x
- [.NET SDK](https://dotnet.microsoft.com/) 8.0+

```bash
git clone https://github.com/Dictionarry-Hub/profilarr.git
cd profilarr
deno task dev
```

This runs the parser service and Vite dev server concurrently. See
[CONTRIBUTING.md](docs/CONTRIBUTING.md) for architecture documentation.

### Environment Variables

| Variable        | Default              | Description                       |
| --------------- | -------------------- | --------------------------------- |
| `PORT`          | `6868`               | Web UI port                       |
| `HOST`          | `0.0.0.0`            | Bind address                      |
| `APP_BASE_PATH` | Executable directory | Base path for data, logs, backups |
| `TZ`            | System timezone      | Timezone for scheduling           |
| `PARSER_HOST`   | `localhost`          | Parser service host               |
| `PARSER_PORT`   | `5000`               | Parser service port               |

## License

[AGPL-3.0](LICENSE)

Profilarr is free and open source. You do not need to pay anyone to use it. If
someone is charging you for access to Profilarr, they are violating the spirit
of this project.
