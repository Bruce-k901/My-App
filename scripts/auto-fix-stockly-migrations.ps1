# Script to automatically fix migrations that reference stockly schema
# This adds conditional checks to prevent errors when schema doesn't exist

$migrationsPath = "supabase\migrations"
$files = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | Where-Object { $_.Name -match "^\d{14}_" }

$fixedCount = 0
$skippedCount = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if file references stockly schema
    if ($content -match "stockly\.") {
        # Check if it already has conditional checks
        if ($content -notmatch "pg_namespace.*stockly|IF NOT EXISTS.*pg_namespace.*stockly") {
            Write-Host "🔧 Fixing: $($file.Name)"
            
            # Create backup
            $backupPath = $file.FullName + ".backup"
            Copy-Item $file.FullName $backupPath
            
            # Read original content
            $lines = Get-Content $file.FullName
            
            # Check if it starts with BEGIN; (transaction)
            $hasBegin = $lines[0] -match "^\s*BEGIN\s*;"
            
            # Find first ALTER TABLE/CREATE/INSERT/UPDATE/DELETE that references stockly
            $firstStocklyRef = -1
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "ALTER TABLE stockly\.|CREATE.*stockly\.|INSERT INTO stockly\.|UPDATE stockly\.|DELETE FROM stockly\.|FROM stockly\.") {
                    $firstStocklyRef = $i
                    break
                }
            }
            
            if ($firstStocklyRef -ge 0) {
                # Build new content
                $newContent = @()
                
                # Add header comment if not present
                if ($lines[0] -notmatch "^--") {
                    $newContent += "-- Migration: $($file.BaseName)"
                    $newContent += "-- This migration only runs if stockly schema exists"
                } else {
                    $newContent += $lines[0]
                    if ($lines.Count -gt 1 -and $lines[1] -notmatch "^--.*stockly") {
                        $newContent += "-- This migration only runs if stockly schema exists"
                    }
                }
                
                # Add conditional check block
                $newContent += "DO `$`$"
                $newContent += "BEGIN"
                $newContent += "  -- Check if stockly schema exists - exit early if it doesn't"
                $newContent += "  IF NOT EXISTS ("
                $newContent += "    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'"
                $newContent += "  ) THEN"
                $newContent += "    RAISE NOTICE 'stockly schema does not exist - skipping $($file.BaseName) migration';"
                $newContent += "    RETURN;"
                $newContent += "  END IF;"
                $newContent += "  "
                $newContent += "  RAISE NOTICE 'stockly schema found - proceeding with $($file.BaseName) migration';"
                $newContent += "END `$`$;"
                $newContent += ""
                $newContent += "-- Only proceed if schema exists (checked above)"
                $newContent += "DO `$`$"
                $newContent += "BEGIN"
                $newContent += "  -- Check if stockly schema exists"
                $newContent += "  IF NOT EXISTS ("
                $newContent += "    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'"
                $newContent += "  ) THEN"
                $newContent += "    RETURN;"
                $newContent += "  END IF;"
                $newContent += ""
                
                # Add remaining lines, converting ALTER TABLE/CREATE statements to EXECUTE
                $inDoBlock = $false
                for ($i = $firstStocklyRef; $i -lt $lines.Count; $i++) {
                    $line = $lines[$i]
                    
                    # Remove BEGIN; if present
                    if ($line -match "^\s*BEGIN\s*;" -and $i -eq 0) {
                        continue
                    }
                    
                    # Remove COMMIT; if present at end
                    if ($line -match "^\s*COMMIT\s*;" -and $i -eq $lines.Count - 1) {
                        continue
                    }
                    
                    # Convert ALTER TABLE stockly to EXECUTE
                    if ($line -match "^\s*ALTER TABLE stockly\.") {
                        $newContent += "  EXECUTE '" + $line.Trim() + "';"
                    }
                    # Convert CREATE statements that reference stockly
                    elseif ($line -match "^\s*CREATE.*stockly\.") {
                        # This is more complex - might need to handle multi-line
                        $newContent += "  EXECUTE '" + $line.Trim() + "';"
                    }
                    else {
                        $newContent += $line
                    }
                }
                
                # Close DO block
                $newContent += "END `$`$;"
                
                # Write new content
                $newContent | Set-Content $file.FullName -Encoding UTF8
                
                Write-Host "  ✅ Fixed: $($file.Name)" -ForegroundColor Green
                $fixedCount++
            } else {
                Write-Host "  ⚠️  Skipped: $($file.Name) - Could not find stockly reference pattern" -ForegroundColor Yellow
                $skippedCount++
            }
        } else {
            Write-Host "✅ Already fixed: $($file.Name)" -ForegroundColor Cyan
            $skippedCount++
        }
    }
}

Write-Host "`n📊 Summary:"
Write-Host "  Fixed: $fixedCount"
Write-Host "  Skipped/Already fixed: $skippedCount"
Write-Host "`n💡 Note: Backups created with .backup extension"
