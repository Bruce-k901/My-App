$count = 0
Get-ChildItem -Path "c:\Users\bruce\my-app\src" -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $changed = $false
    if ($content -match "from 'lucide-react'") {
        $content = $content -replace "from 'lucide-react'", "from '@/components/ui/icons'"
        $changed = $true
    }
    if ($content -match 'from "lucide-react"') {
        $content = $content -replace 'from "lucide-react"', 'from "@/components/ui/icons"'
        $changed = $true
    }
    if ($changed) {
        [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.UTF8Encoding]::new($false))
        $count++
        Write-Output ("Updated: " + $_.Name)
    }
}
Write-Output ""
Write-Output "Total files updated: $count"
