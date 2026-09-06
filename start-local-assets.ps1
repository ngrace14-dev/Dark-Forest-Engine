param(
    [int]$Port = 8765
)

$root = $PSScriptRoot
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Output "Serving $root at http://localhost:$Port/"
Write-Output 'Open the GitHub Pages demo with ?assetBase=http://localhost:8765/'

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $response = $context.Response
        $response.Headers.Add('Access-Control-Allow-Origin', 'https://ngrace14-dev.github.io')
        $response.Headers.Add('Access-Control-Allow-Methods', 'GET, OPTIONS')

        if ($context.Request.HttpMethod -eq 'OPTIONS') {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        if ($context.Request.HttpMethod -ne 'GET') {
            $response.StatusCode = 405
            $response.Close()
            continue
        }

        $relativePath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/').Replace('/', '\')
        $filePath = [IO.Path]::GetFullPath((Join-Path $root $relativePath))
        if (!$filePath.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or !(Test-Path -LiteralPath $filePath -PathType Leaf)) {
            $response.StatusCode = 404
            $response.Close()
            continue
        }

        $response.ContentType = switch -Regex ($filePath.ToLowerInvariant()) {
            '\.html?$' { 'text/html; charset=utf-8'; break }
            '\.js$' { 'text/javascript; charset=utf-8'; break }
            '\.css$' { 'text/css; charset=utf-8'; break }
            '\.json$' { 'application/json; charset=utf-8'; break }
            '\.glb$' { 'model/gltf-binary'; break }
            '\.gltf$' { 'model/gltf+json'; break }
            '\.png$' { 'image/png'; break }
            '\.jpe?g$' { 'image/jpeg'; break }
            '\.webp$' { 'image/webp'; break }
            default { 'application/octet-stream' }
        }
        $bytes = [IO.File]::ReadAllBytes($filePath)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
    }
} finally {
    $listener.Close()
}