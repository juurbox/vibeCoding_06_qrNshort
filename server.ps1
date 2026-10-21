$port = 8088
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Server running at http://localhost:$port/"
} catch {
    Write-Error "Failed to start listener: $_"
    exit 1
}

$root = $PSScriptRoot

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers for all requests
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "*")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.OutputStream.Close()
            continue
        }

        $urlPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath.TrimStart('/'))

        # API: URL Shorten Proxy
        if ($urlPath -eq "api/shorten" -or $urlPath.StartsWith("api/shorten")) {
            $target = $request.QueryString["url"]
            if ([string]::IsNullOrWhiteSpace($target)) {
                $response.StatusCode = 400
                $msg = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Missing url parameter"}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.OutputStream.Write($msg, 0, $msg.Length)
            } else {
                $short = $null
                # 1. Try TinyURL
                try {
                    $encoded = [System.Uri]::EscapeDataString($target)
                    $tinyRes = Invoke-RestMethod -Uri "https://tinyurl.com/api-create.php?url=$encoded" -TimeoutSec 4
                    if ($tinyRes -and $tinyRes.StartsWith("http")) {
                        $short = $tinyRes.Trim()
                    }
                } catch {}

                # 2. Try da.gd
                if (-not $short) {
                    try {
                        $encoded = [System.Uri]::EscapeDataString($target)
                        $dagdRes = (Invoke-WebRequest -Uri "https://da.gd/s?url=$encoded" -TimeoutSec 4 -UseBasicParsing).Content
                        if ($dagdRes -and $dagdRes.StartsWith("http")) {
                            $short = $dagdRes.Trim()
                        }
                    } catch {}
                }

                # 3. Try is.gd
                if (-not $short) {
                    try {
                        $encoded = [System.Uri]::EscapeDataString($target)
                        $isgd = Invoke-RestMethod -Uri "https://is.gd/create.php?format=json&url=$encoded" -TimeoutSec 4
                        if ($isgd.shorturl) {
                            $short = $isgd.shorturl.Trim()
                        }
                    } catch {}
                }

                if ($short) {
                    $response.StatusCode = 200
                    $response.ContentType = "application/json; charset=utf-8"
                    $json = [System.Text.Encoding]::UTF8.GetBytes("{`"shorturl`":`"$short`"}")
                    $response.OutputStream.Write($json, 0, $json.Length)
                } else {
                    $response.StatusCode = 502
                    $response.ContentType = "application/json; charset=utf-8"
                    $json = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Failed to shorten url"}')
                    $response.OutputStream.Write($json, 0, $json.Length)
                }
            }
            continue
        }

        if ([string]::IsNullOrEmpty($urlPath)) {
            $urlPath = "index.html"
        }

        $filePath = Join-Path $root $urlPath
        if (Test-Path $filePath -PathType Container) {
            $filePath = Join-Path $filePath "index.html"
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".png"  { "image/png" }
                ".svg"  { "image/svg+xml" }
                ".json" { "application/json" }
                default { "application/octet-stream" }
            }

            $response.ContentType = $contentType
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
    } catch {
        # ignore context errors on shutdown
    } finally {
        if ($response) {
            $response.OutputStream.Close()
        }
    }
}
