# Convert-JsonToCsv.ps1
# Converts a JSON array of objects to a CSV spreadsheet.

$inputPath  = "C:\Users\John\Documents\Websites\ciphers\cache.json"
$outputPath = "C:\Users\John\Documents\Websites\ciphers\wordanalysis.csv"

Write-Host "Reading JSON file from $inputPath ..."

# Read and parse the JSON
$jsonData = Get-Content -Raw -Path $inputPath | ConvertFrom-Json

if ($null -eq $jsonData) {
    Write-Error "Failed to parse JSON. Check that the file contains a valid JSON array."
    exit 1
}

Write-Host "Found $($jsonData.Count) records. Converting to CSV..."

# Convert and export to CSV
$jsonData | Export-Csv -Path $outputPath -NoTypeInformation -Encoding UTF8

Write-Host "✅ Conversion complete!"
Write-Host "CSV saved as: $outputPath"