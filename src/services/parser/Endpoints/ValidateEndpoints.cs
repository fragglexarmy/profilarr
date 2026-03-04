using System.Text.RegularExpressions;
using Parser.Logging;
using Parser.Models;

namespace Parser.Endpoints;

public static class ValidateEndpoints
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/validate/regex", HandleValidateRegex);
    }

    private static IResult HandleValidateRegex(ValidateRegexRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Pattern))
        {
            Log.Debug("Validate regex request rejected: missing pattern", "Validate");
            return Results.BadRequest(new { error = "Pattern is required" });
        }

        try
        {
            _ = new Regex(request.Pattern, RegexOptions.IgnoreCase, TimeSpan.FromMilliseconds(100));
            Log.Debug($"Pattern valid: {request.Pattern}", "Validate");
            return Results.Ok(new ValidateRegexResponse(true));
        }
        catch (ArgumentException ex)
        {
            Log.Debug($"Pattern invalid: {request.Pattern} - {ex.Message}", "Validate");
            return Results.Ok(new ValidateRegexResponse(false, ex.Message));
        }
    }
}
