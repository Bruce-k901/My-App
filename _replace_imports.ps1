$count = 0
$dirs = @('src\app', 'src\config')
foreach ($dir in $dirs) {
    $files = Get-ChildItem -Path $dir -Recurse -File -Include '*.ts','*.tsx','*.js','*.jsx'
    foreach ($f in $files) {
        $content = Get-Content -Path $f.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -and ($content -match "from 'lucide-react'" -or $content -match 'from "lucide-react"')) {
            $newContent = $content -replace "from 'lucide-react'", "from '@/components/ui/icons'"
            $newContent = $newContent -replace 'from "lucide-react"', 'from "@/components/ui/icons"'
            [System.IO.File]::WriteAllText($f.FullName, $newContent)
            $count++
        }
    }
}
Write-Output "Total files updated: $count"
