using Parser.Core;

// Bump this version when parser logic changes (regex patterns, parsing behavior, etc.)
// This invalidates the parse result cache in Profilarr
const string ParserVersion = "1.0.0";

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.MapPost("/parse", (ParseRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { error = "Title is required" });
    }

    if (string.IsNullOrWhiteSpace(request.Type) ||
        (request.Type != "movie" && request.Type != "series"))
    {
        return Results.BadRequest(new { error = "Type is required and must be 'movie' or 'series'" });
    }

    var qualityResult = QualityParser.ParseQuality(request.Title);
    var languages = LanguageParser.ParseLanguages(request.Title);
    var releaseGroup = ReleaseGroupParser.ParseReleaseGroup(request.Title);

    if (request.Type == "movie")
    {
        var titleInfo = TitleParser.ParseMovieTitle(request.Title);
        return Results.Ok(new ParseResponse
        {
            Title = request.Title,
            Type = "movie",
            Source = qualityResult.Source.ToString(),
            Resolution = (int)qualityResult.Resolution,
            Modifier = qualityResult.Modifier.ToString(),
            Revision = new RevisionResponse
            {
                Version = qualityResult.Revision.Version,
                Real = qualityResult.Revision.Real,
                IsRepack = qualityResult.Revision.IsRepack
            },
            Languages = languages.Select(l => l.ToString()).ToList(),
            ReleaseGroup = releaseGroup,
            MovieTitles = titleInfo?.MovieTitles ?? new List<string>(),
            Year = titleInfo?.Year ?? 0,
            Edition = titleInfo?.Edition,
            ImdbId = titleInfo?.ImdbId,
            TmdbId = titleInfo?.TmdbId ?? 0,
            HardcodedSubs = titleInfo?.HardcodedSubs,
            ReleaseHash = titleInfo?.ReleaseHash,
            Episode = null
        });
    }
    else // series
    {
        var episodeInfo = EpisodeParser.ParseTitle(request.Title);
        return Results.Ok(new ParseResponse
        {
            Title = request.Title,
            Type = "series",
            Source = qualityResult.Source.ToString(),
            Resolution = (int)qualityResult.Resolution,
            Modifier = qualityResult.Modifier.ToString(),
            Revision = new RevisionResponse
            {
                Version = qualityResult.Revision.Version,
                Real = qualityResult.Revision.Real,
                IsRepack = qualityResult.Revision.IsRepack
            },
            Languages = languages.Select(l => l.ToString()).ToList(),
            ReleaseGroup = releaseGroup,
            MovieTitles = new List<string>(),
            Year = 0,
            Edition = null,
            ImdbId = null,
            TmdbId = 0,
            HardcodedSubs = null,
            ReleaseHash = null,
            Episode = episodeInfo != null ? new EpisodeResponse
            {
                SeriesTitle = episodeInfo.SeriesTitle,
                SeasonNumber = episodeInfo.SeasonNumber,
                EpisodeNumbers = episodeInfo.EpisodeNumbers.ToList(),
                AbsoluteEpisodeNumbers = episodeInfo.AbsoluteEpisodeNumbers.ToList(),
                AirDate = episodeInfo.AirDate,
                FullSeason = episodeInfo.FullSeason,
                IsPartialSeason = episodeInfo.IsPartialSeason,
                IsMultiSeason = episodeInfo.IsMultiSeason,
                IsMiniSeries = episodeInfo.IsMiniSeries,
                Special = episodeInfo.Special,
                ReleaseType = episodeInfo.ReleaseType.ToString()
            } : null
        });
    }
});

app.MapGet("/health", () => Results.Ok(new { status = "healthy", version = ParserVersion }));

app.MapPost("/match", (MatchRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Text))
    {
        return Results.BadRequest(new { error = "Text is required" });
    }

    if (request.Patterns == null || request.Patterns.Count == 0)
    {
        return Results.BadRequest(new { error = "At least one pattern is required" });
    }

    var results = new Dictionary<string, bool>();

    foreach (var pattern in request.Patterns)
    {
        try
        {
            var regex = new System.Text.RegularExpressions.Regex(
                pattern,
                System.Text.RegularExpressions.RegexOptions.IgnoreCase,
                TimeSpan.FromMilliseconds(100) // Timeout to prevent ReDoS
            );
            results[pattern] = regex.IsMatch(request.Text);
        }
        catch (System.Text.RegularExpressions.RegexMatchTimeoutException)
        {
            // Pattern took too long, treat as no match
            results[pattern] = false;
        }
        catch (System.ArgumentException)
        {
            // Invalid regex pattern
            results[pattern] = false;
        }
    }

    return Results.Ok(new MatchResponse { Results = results });
});

app.Run();

public record ParseRequest(string Title, string? Type);

public record ParseResponse
{
    public string Title { get; init; } = "";
    public string Type { get; init; } = "";
    public string Source { get; init; } = "";
    public int Resolution { get; init; }
    public string Modifier { get; init; } = "";
    public RevisionResponse Revision { get; init; } = new();
    public List<string> Languages { get; init; } = new();
    public string? ReleaseGroup { get; init; }
    public List<string> MovieTitles { get; init; } = new();
    public int Year { get; init; }
    public string? Edition { get; init; }
    public string? ImdbId { get; init; }
    public int TmdbId { get; init; }
    public string? HardcodedSubs { get; init; }
    public string? ReleaseHash { get; init; }
    public EpisodeResponse? Episode { get; init; }
}

public record RevisionResponse
{
    public int Version { get; init; } = 1;
    public int Real { get; init; }
    public bool IsRepack { get; init; }
}

public record EpisodeResponse
{
    public string? SeriesTitle { get; init; }
    public int SeasonNumber { get; init; }
    public List<int> EpisodeNumbers { get; init; } = new();
    public List<int> AbsoluteEpisodeNumbers { get; init; } = new();
    public string? AirDate { get; init; }
    public bool FullSeason { get; init; }
    public bool IsPartialSeason { get; init; }
    public bool IsMultiSeason { get; init; }
    public bool IsMiniSeries { get; init; }
    public bool Special { get; init; }
    public string ReleaseType { get; init; } = "Unknown";
}

public record MatchRequest(string Text, List<string> Patterns);

public record MatchResponse
{
    public Dictionary<string, bool> Results { get; init; } = new();
}
