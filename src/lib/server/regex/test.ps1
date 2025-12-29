# Test regex pattern against test strings using .NET regex engine
# Usage: pwsh test.ps1 -Pattern "regex" -TestsJson '[{"testString":"test","criteria":"DOES_MATCH"}]'

param(
    [Parameter(Mandatory=$true)]
    [string]$Pattern,

    [Parameter(Mandatory=$true)]
    [string]$TestsJson
)

try {
    $tests = $TestsJson | ConvertFrom-Json
    $results = @()

    foreach ($test in $tests) {
        try {
            $matched = [regex]::IsMatch(
                $test.testString,
                $Pattern,
                [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
            )

            $expectedMatch = $test.criteria -eq "DOES_MATCH"
            $passed = $matched -eq $expectedMatch

            $results += @{
                testString = $test.testString
                expected = $test.criteria
                actual = $matched
                passed = $passed
            }
        } catch {
            $results += @{
                testString = $test.testString
                expected = $test.criteria
                actual = $false
                passed = $false
                error = $_.Exception.Message
            }
        }
    }

    @{ success = $true; results = $results } | ConvertTo-Json -Depth 3 -Compress
} catch {
    @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
}
