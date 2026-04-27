$root = (Resolve-Path "src\modules\01-identity-access\01-users").Path
$out = Join-Path (Get-Location) ("01-users-dump-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md")

$files = Get-ChildItem -Path $root -Recurse -File -Filter "*.ts" | Sort-Object FullName
$total = $files.Count
$index = 0
$failedFiles = @()

if ($total -eq 0) {
throw "No se encontraron archivos .ts en: $root"
}

Write-Host "Generating dump..."
Write-Host "Root: $root"
Write-Host "Files found: $total"
Write-Host "Output: $out"
Write-Host ""

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($out, $false, $utf8NoBom)

try {
$writer.WriteLine("# 01-users code dump")
$writer.WriteLine()
$writer.WriteLine("> Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$writer.WriteLine("> Root: $root")
$writer.WriteLine("> Files found: $total")
$writer.WriteLine()

    foreach ($file in $files) {
        $index++
        $percent = [int](($index / $total) * 100)
        $relativePath = $file.FullName.Substring($root.Length + 1).Replace('\', '/')

        Write-Progress `
            -Activity "Generating 01-users dump" `
            -Status "Processing $relativePath ($index of $total)" `
            -PercentComplete $percent

        Write-Host "[$index/$total] $relativePath"

        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)

            $writer.WriteLine("---")
            $writer.WriteLine("## $relativePath")
            $writer.WriteLine('```ts')
            $writer.WriteLine($content.TrimEnd())
            $writer.WriteLine('```')
            $writer.WriteLine()
            $writer.Flush()
        }
        catch {
            $failedFiles += $file.FullName
            Write-Warning "No se pudo leer: $($file.FullName). Error: $($_.Exception.Message)"
        }
    }

    if ($failedFiles.Count -gt 0) {
        $writer.WriteLine("---")
        $writer.WriteLine("## Failed files")
        $writer.WriteLine()
        foreach ($failed in $failedFiles) {
            $writer.WriteLine("- $failed")
        }
        $writer.WriteLine()
        $writer.Flush()
    }

}
finally {
$writer.Dispose()
Write-Progress -Activity "Generating 01-users dump" -Completed
}

Write-Host ""
Write-Host "Done. Output: $out"
Write-Host "Files processed: $total"
Write-Host "Files failed: $($failedFiles.Count)"

---

$root = (Resolve-Path "src\modules\01-identity-access\02-auth").Path
$out = Join-Path (Get-Location) ("02-auth-dump-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md")

$files = Get-ChildItem -Path $root -Recurse -File -Filter "*.ts" | Sort-Object FullName
$total = $files.Count
$index = 0
$failedFiles = @()

if ($total -eq 0) {
throw "No se encontraron archivos .ts en: $root"
}

Write-Host "Generating dump..."
Write-Host "Root: $root"
Write-Host "Files found: $total"
Write-Host "Output: $out"
Write-Host ""

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($out, $false, $utf8NoBom)

try {
$writer.WriteLine("# 02-auth code dump")
$writer.WriteLine()
$writer.WriteLine("> Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$writer.WriteLine("> Root: $root")
$writer.WriteLine("> Files found: $total")
$writer.WriteLine()

    foreach ($file in $files) {
        $index++
        $percent = [int](($index / $total) * 100)
        $relativePath = $file.FullName.Substring($root.Length + 1).Replace('\', '/')

        Write-Progress `
            -Activity "Generating 02-auth dump" `
            -Status "Processing $relativePath ($index of $total)" `
            -PercentComplete $percent

        Write-Host "[$index/$total] $relativePath"

        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)

            $writer.WriteLine("---")
            $writer.WriteLine("## $relativePath")
            $writer.WriteLine('```ts')
            $writer.WriteLine($content.TrimEnd())
            $writer.WriteLine('```')
            $writer.WriteLine()
            $writer.Flush()
        }
        catch {
            $failedFiles += $file.FullName
            Write-Warning "No se pudo leer: $($file.FullName). Error: $($_.Exception.Message)"
        }
    }

    if ($failedFiles.Count -gt 0) {
        $writer.WriteLine("---")
        $writer.WriteLine("## Failed files")
        $writer.WriteLine()
        foreach ($failed in $failedFiles) {
            $writer.WriteLine("- $failed")
        }
        $writer.WriteLine()
        $writer.Flush()
    }

}
finally {
$writer.Dispose()
Write-Progress -Activity "Generating 02-auth dump" -Completed
}

Write-Host ""
Write-Host "Done. Output: $out"
Write-Host "Files processed: $total"
Write-Host "Files failed: $($failedFiles.Count)"

---

$root = (Resolve-Path "src\modules\01-identity-access\03-memberships").Path
$out = Join-Path (Get-Location) ("03-memberships-dump-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md")

$files = Get-ChildItem -Path $root -Recurse -File -Filter "*.ts" | Sort-Object FullName
$total = $files.Count
$index = 0
$failedFiles = @()

if ($total -eq 0) {
throw "No se encontraron archivos .ts en: $root"
}

Write-Host "Generating dump..."
Write-Host "Root: $root"
Write-Host "Files found: $total"
Write-Host "Output: $out"
Write-Host ""

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($out, $false, $utf8NoBom)

try {
$writer.WriteLine("# 03-memberships code dump")
$writer.WriteLine()
$writer.WriteLine("> Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$writer.WriteLine("> Root: $root")
$writer.WriteLine("> Files found: $total")
$writer.WriteLine()

    foreach ($file in $files) {
        $index++
        $percent = [int](($index / $total) * 100)
        $relativePath = $file.FullName.Substring($root.Length + 1).Replace('\', '/')

        Write-Progress `
            -Activity "Generating 03-memberships dump" `
            -Status "Processing $relativePath ($index of $total)" `
            -PercentComplete $percent

        Write-Host "[$index/$total] $relativePath"

        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)

            $writer.WriteLine("---")
            $writer.WriteLine("## $relativePath")
            $writer.WriteLine('```ts')
            $writer.WriteLine($content.TrimEnd())
            $writer.WriteLine('```')
            $writer.WriteLine()
            $writer.Flush()
        }
        catch {
            $failedFiles += $file.FullName
            Write-Warning "No se pudo leer: $($file.FullName). Error: $($_.Exception.Message)"
        }
    }

    if ($failedFiles.Count -gt 0) {
        $writer.WriteLine("---")
        $writer.WriteLine("## Failed files")
        $writer.WriteLine()
        foreach ($failed in $failedFiles) {
            $writer.WriteLine("- $failed")
        }
        $writer.WriteLine()
        $writer.Flush()
    }

}
finally {
$writer.Dispose()
Write-Progress -Activity "Generating 03-memberships dump" -Completed
}

Write-Host ""
Write-Host "Done. Output: $out"
Write-Host "Files processed: $total"
Write-Host "Files failed: $($failedFiles.Count)"

---

$root = (Resolve-Path "src\modules\01-identity-access\04-roles").Path
$out = Join-Path (Get-Location) ("04-roles-dump-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md")

$files = Get-ChildItem -Path $root -Recurse -File -Filter "*.ts" | Sort-Object FullName
$total = $files.Count
$index = 0
$failedFiles = @()

if ($total -eq 0) {
throw "No se encontraron archivos .ts en: $root"
}

Write-Host "Generating dump..."
Write-Host "Root: $root"
Write-Host "Files found: $total"
Write-Host "Output: $out"
Write-Host ""

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($out, $false, $utf8NoBom)

try {
$writer.WriteLine("# 04-roles code dump")
$writer.WriteLine()
$writer.WriteLine("> Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$writer.WriteLine("> Root: $root")
$writer.WriteLine("> Files found: $total")
$writer.WriteLine()

    foreach ($file in $files) {
        $index++
        $percent = [int](($index / $total) * 100)
        $relativePath = $file.FullName.Substring($root.Length + 1).Replace('\', '/')

        Write-Progress `
            -Activity "Generating 04-roles dump" `
            -Status "Processing $relativePath ($index of $total)" `
            -PercentComplete $percent

        Write-Host "[$index/$total] $relativePath"

        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)

            $writer.WriteLine("---")
            $writer.WriteLine("## $relativePath")
            $writer.WriteLine('```ts')
            $writer.WriteLine($content.TrimEnd())
            $writer.WriteLine('```')
            $writer.WriteLine()
            $writer.Flush()
        }
        catch {
            $failedFiles += $file.FullName
            Write-Warning "No se pudo leer: $($file.FullName). Error: $($_.Exception.Message)"
        }
    }

    if ($failedFiles.Count -gt 0) {
        $writer.WriteLine("---")
        $writer.WriteLine("## Failed files")
        $writer.WriteLine()
        foreach ($failed in $failedFiles) {
            $writer.WriteLine("- $failed")
        }
        $writer.WriteLine()
        $writer.Flush()
    }

}
finally {
$writer.Dispose()
Write-Progress -Activity "Generating 04-roles dump" -Completed
}

Write-Host ""
Write-Host "Done. Output: $out"
Write-Host "Files processed: $total"
Write-Host "Files failed: $($failedFiles.Count)"

---

$root = (Resolve-Path "src\modules\01-identity-access\05-grants").Path
$out = Join-Path (Get-Location) ("05-grants-dump-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md")

$files = Get-ChildItem -Path $root -Recurse -File -Filter "*.ts" | Sort-Object FullName
$total = $files.Count
$index = 0
$failedFiles = @()

if ($total -eq 0) {
throw "No se encontraron archivos .ts en: $root"
}

Write-Host "Generating dump..."
Write-Host "Root: $root"
Write-Host "Files found: $total"
Write-Host "Output: $out"
Write-Host ""

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($out, $false, $utf8NoBom)

try {
$writer.WriteLine("# 05-grants code dump")
$writer.WriteLine()
$writer.WriteLine("> Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$writer.WriteLine("> Root: $root")
$writer.WriteLine("> Files found: $total")
$writer.WriteLine()

    foreach ($file in $files) {
        $index++
        $percent = [int](($index / $total) * 100)
        $relativePath = $file.FullName.Substring($root.Length + 1).Replace('\', '/')

        Write-Progress `
            -Activity "Generating 05-grants dump" `
            -Status "Processing $relativePath ($index of $total)" `
            -PercentComplete $percent

        Write-Host "[$index/$total] $relativePath"

        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)

            $writer.WriteLine("---")
            $writer.WriteLine("## $relativePath")
            $writer.WriteLine('```ts')
            $writer.WriteLine($content.TrimEnd())
            $writer.WriteLine('```')
            $writer.WriteLine()
            $writer.Flush()
        }
        catch {
            $failedFiles += $file.FullName
            Write-Warning "No se pudo leer: $($file.FullName). Error: $($_.Exception.Message)"
        }
    }

    if ($failedFiles.Count -gt 0) {
        $writer.WriteLine("---")
        $writer.WriteLine("## Failed files")
        $writer.WriteLine()
        foreach ($failed in $failedFiles) {
            $writer.WriteLine("- $failed")
        }
        $writer.WriteLine()
        $writer.Flush()
    }

}
finally {
$writer.Dispose()
Write-Progress -Activity "Generating 05-grants dump" -Completed
}

Write-Host ""
Write-Host "Done. Output: $out"
Write-Host "Files processed: $total"
Write-Host "Files failed: $($failedFiles.Count)"

---

$root = (Resolve-Path "src\modules\01-identity-access\06-invitations").Path
$out = Join-Path (Get-Location) ("06-invitations-dump-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md")

$files = Get-ChildItem -Path $root -Recurse -File -Filter "*.ts" | Sort-Object FullName
$total = $files.Count
$index = 0
$failedFiles = @()

if ($total -eq 0) {
throw "No se encontraron archivos .ts en: $root"
}

Write-Host "Generating dump..."
Write-Host "Root: $root"
Write-Host "Files found: $total"
Write-Host "Output: $out"
Write-Host ""

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($out, $false, $utf8NoBom)

try {
$writer.WriteLine("# 06-invitations code dump")
$writer.WriteLine()
$writer.WriteLine("> Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$writer.WriteLine("> Root: $root")
$writer.WriteLine("> Files found: $total")
$writer.WriteLine()

    foreach ($file in $files) {
        $index++
        $percent = [int](($index / $total) * 100)
        $relativePath = $file.FullName.Substring($root.Length + 1).Replace('\', '/')

        Write-Progress `
            -Activity "Generating 06-invitations dump" `
            -Status "Processing $relativePath ($index of $total)" `
            -PercentComplete $percent

        Write-Host "[$index/$total] $relativePath"

        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)

            $writer.WriteLine("---")
            $writer.WriteLine("## $relativePath")
            $writer.WriteLine('```ts')
            $writer.WriteLine($content.TrimEnd())
            $writer.WriteLine('```')
            $writer.WriteLine()
            $writer.Flush()
        }
        catch {
            $failedFiles += $file.FullName
            Write-Warning "No se pudo leer: $($file.FullName). Error: $($_.Exception.Message)"
        }
    }

    if ($failedFiles.Count -gt 0) {
        $writer.WriteLine("---")
        $writer.WriteLine("## Failed files")
        $writer.WriteLine()
        foreach ($failed in $failedFiles) {
            $writer.WriteLine("- $failed")
        }
        $writer.WriteLine()
        $writer.Flush()
    }

}
finally {
$writer.Dispose()
Write-Progress -Activity "Generating 06-invitations dump" -Completed
}

Write-Host ""
Write-Host "Done. Output: $out"
Write-Host "Files processed: $total"
Write-Host "Files failed: $($failedFiles.Count)"

---

$root = (Resolve-Path "src\modules\01-identity-access\07-access-resolution").Path
$out = Join-Path (Get-Location) ("07-access-resolution-dump-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md")

$files = Get-ChildItem -Path $root -Recurse -File -Filter "*.ts" | Sort-Object FullName
$total = $files.Count
$index = 0
$failedFiles = @()

if ($total -eq 0) {
throw "No se encontraron archivos .ts en: $root"
}

Write-Host "Generating dump..."
Write-Host "Root: $root"
Write-Host "Files found: $total"
Write-Host "Output: $out"
Write-Host ""

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($out, $false, $utf8NoBom)

try {
$writer.WriteLine("# 07-access-resolution code dump")
$writer.WriteLine()
$writer.WriteLine("> Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$writer.WriteLine("> Root: $root")
$writer.WriteLine("> Files found: $total")
$writer.WriteLine()

    foreach ($file in $files) {
        $index++
        $percent = [int](($index / $total) * 100)
        $relativePath = $file.FullName.Substring($root.Length + 1).Replace('\', '/')

        Write-Progress `
            -Activity "Generating 07-access-resolution dump" `
            -Status "Processing $relativePath ($index of $total)" `
            -PercentComplete $percent

        Write-Host "[$index/$total] $relativePath"

        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)

            $writer.WriteLine("---")
            $writer.WriteLine("## $relativePath")
            $writer.WriteLine('```ts')
            $writer.WriteLine($content.TrimEnd())
            $writer.WriteLine('```')
            $writer.WriteLine()
            $writer.Flush()
        }
        catch {
            $failedFiles += $file.FullName
            Write-Warning "No se pudo leer: $($file.FullName). Error: $($_.Exception.Message)"
        }
    }

    if ($failedFiles.Count -gt 0) {
        $writer.WriteLine("---")
        $writer.WriteLine("## Failed files")
        $writer.WriteLine()
        foreach ($failed in $failedFiles) {
            $writer.WriteLine("- $failed")
        }
        $writer.WriteLine()
        $writer.Flush()
    }

}
finally {
$writer.Dispose()
Write-Progress -Activity "Generating 07-access-resolution dump" -Completed
}

Write-Host ""
Write-Host "Done. Output: $out"
Write-Host "Files processed: $total"
Write-Host "Files failed: $($failedFiles.Count)"

---
