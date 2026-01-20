# ============================================================================
# Align Supabase CLI Migration History
# ============================================================================
# This script runs all the migration repair commands suggested by Supabase CLI
# to align the local and remote migration history.
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host "Aligning Supabase CLI Migration History" -ForegroundColor Cyan
Write-Host ""

# List of migrations to repair (from the terminal output)
$migrationsToRepair = @(
    "20260119203009",  # reverted
    "20250108000001",  # applied
    "20250108000002",  # applied
    "20250108000003",  # applied
    "20250108000004",  # applied
    "20250108000005",  # applied
    "20250108000006",  # applied
    "20250108000007",  # applied
    "20250108000008",  # applied
    "20250108000009",  # applied
    "20250108000010",  # applied
    "20250108000011",  # applied
    "20250108000012",  # applied
    "20250108000013",  # applied
    "20250108000014",  # applied
    "20250109000001",  # applied
    "20250109000002",  # applied
    "20250109000004",  # applied
    "20250109000005",  # applied
    "20250115000000",  # applied
    "20250116000000",  # applied
    "20250120000001",  # applied
    "20250120000002",  # applied
    "20250131000001",  # applied
    "20250131000002",  # applied
    "20250131000003",  # applied
    "20250131000004",  # applied
    "20250131000005",  # applied
    "20250131000006",  # applied
    "20250131000007",  # applied
    "20250131000008",  # applied
    "20250131000009",  # applied
    "20250131000010",  # applied
    "20250131000011",  # applied
    "20250131000012",  # applied (duplicate)
    "20250131000013",  # applied
    "20250131000014",  # applied
    "20250131000015",  # applied
    "20250131000016",  # applied
    "20250131000017",  # applied
    "20250210000000",  # applied
    "20250211000000",  # applied
    "20250211000001",  # applied
    "20250212000001",  # applied (duplicate)
    "20250212000002",  # applied
    "20250215000000",  # applied
    "20250217000004",  # applied
    "20250217000005",  # applied
    "20250217000006",  # applied
    "20250217000007",  # applied
    "20250217000008",  # applied
    "20250217000009",  # applied
    "20250217000010",  # applied
    "20250217000011",  # applied
    "20250217000012",  # applied
    "20250217000013",  # applied
    "20250217000014",  # applied
    "20250217000015",  # applied
    "20250217000016",  # applied
    "20250217000017",  # applied
    "20250217000018",  # applied
    "20250217000019",  # applied
    "20250218000000",  # applied
    "20250220000000",  # applied
    "20250220000001",  # applied
    "20250220000099",  # applied
    "20250221000001",  # applied
    "20250221000003",  # applied
    "20250222000000",  # applied
    "20250222000002",  # applied
    "20250223000004",  # applied
    "20250223000005",  # applied
    "20250223000006",  # applied
    "20250224000001",  # applied
    "20250225000001",  # applied
    "20250225000002",  # applied
    "20250225000003",  # applied
    "20250225000004",  # applied
    "20250231000001",  # applied
    "20250231000002",  # applied
    "20250231000003",  # applied
    "20250231000004",  # applied
    "20250231000005",  # applied
    "20250231000006",  # applied
    "20250302000001",  # applied
    "20250302000002",  # applied
    "20250302000003",  # applied
    "20250302000004",  # applied
    "20250302000005",  # applied
    "20250303000001",  # applied
    "20250303000002",  # applied
    "20250303000003",  # applied
    "20250303000004",  # applied
    "20250303000005",  # applied
    "20250305000001",  # applied
    "20250305000002",  # applied
    "20250305000003",  # applied
    "20250305000004",  # applied
    "20250306000001",  # applied
    "20250306000002",  # applied
    "20250306000003",  # applied
    "20250306000004",  # applied
    "20250306000005",  # applied
    "20250307000001",  # applied
    "20250307000002",  # applied
    "20250307000003",  # applied
    "20250308000001",  # applied
    "20250308000002",  # applied
    "20250308000003",  # applied
    "20250308000004",  # applied
    "20250311000001",  # applied
    "20250311000002",  # applied
    "20250311000003",  # applied
    "20250311000004",  # applied
    "20250311000005",  # applied
    "20250311000006",  # applied
    "20250311000007",  # applied
    "20250311000008",  # applied
    "20250311000009",  # applied
    "20250311000010",  # applied
    "20250312000001",  # applied
    "20250312000002",  # applied
    "20250313000001",  # applied
    "20250315000001",  # applied (duplicate)
    "20250320000000",  # applied
    "20250320000001",  # applied (duplicate)
    "20250320000002",  # applied (duplicate)
    "20250320000003",  # applied
    "20250320000004",  # applied
    "20250320000005",  # applied
    "20250320000006",  # applied
    "20250320000007",  # applied
    "20250320000008",  # applied
    "20250321000007",  # applied
    "20250321000008",  # applied
    "20250321000009",  # applied
    "20250321000010",  # applied
    "20250322000001",  # applied
    "20250322000002",  # applied
    "20250322000003",  # applied
    "20250322000004",  # applied
    "20250322000005",  # applied
    "20250322000006",  # applied
    "20250322000007",  # applied
    "20250322000008",  # applied
    "20250322000009",  # applied
    "20250322000010",  # applied
    "20250322000011",  # applied
    "20250323000001",  # applied
    "20250323000002",  # applied
    "20251212000001",  # applied
    "20251213000002",  # applied
    "20251213000004",  # applied
    "20251213000005",  # applied
    "20251213000007",  # applied
    "20251215000001",  # applied
    "20251215000002",  # applied
    "20251215000003",  # applied
    "20251215000004",  # applied
    "20251215000005",  # applied
    "20251215000006",  # applied
    "20251215000007",  # applied
    "20251215000008",  # applied
    "20251215000009",  # applied
    "20251215000010",  # applied
    "20251215072839",  # applied
    "20251215075222",  # applied
    "20251215081025",  # applied
    "20251215082716",  # applied
    "20251215090000",  # applied
    "20251215090500",  # applied
    "20251215121500",  # applied
    "20251215123000",  # applied
    "20251215125000",  # applied
    "20251215130000",  # applied
    "20251215132000",  # applied
    "20251215134000",  # applied
    "20251215135000",  # applied
    "20251216000000",  # applied
    "20251216000001",  # applied
    "20251217000000",  # applied
    "20251217000001",  # applied
    "20251217000002",  # applied
    "20251217000003",  # applied
    "20251226230020",  # applied
    "20251226230952",  # applied
    "20251226232439",  # applied
    "20251227000001",  # applied
    "20251227000002",  # applied
    "20251227000003",  # applied
    "20251227000004",  # applied
    "20251227000005",  # applied
    "20251227000006",  # applied
    "20251227000007",  # applied
    "20251227000008",  # applied
    "20251227000009",  # applied
    "20251227000010",  # applied
    "20251227000011",  # applied
    "20251230000001",  # applied
    "20251230000002",  # applied
    "20251230000003",  # applied
    "20251230000004",  # applied
    "99999999999999"   # applied
)

Write-Host "Found $($migrationsToRepair.Count) migrations to repair" -ForegroundColor Green
Write-Host ""

# First, handle the reverted migration
Write-Host "Marking migration 20260119203009 as reverted..." -ForegroundColor Yellow
$revertResult = supabase migration repair --status reverted 20260119203009 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Reverted migration 20260119203009" -ForegroundColor Green
} else {
    Write-Host "[WARN] Could not revert migration 20260119203009 (may not exist): $revertResult" -ForegroundColor Yellow
}
Write-Host ""

# Process all migrations in batches to avoid overwhelming the CLI
$batchSize = 10
$totalBatches = [Math]::Ceiling($migrationsToRepair.Count / $batchSize)
$currentBatch = 0
$successCount = 0
$failCount = 0

Write-Host "Processing migrations in batches of $batchSize..." -ForegroundColor Cyan
Write-Host ""

for ($i = 0; $i -lt $migrationsToRepair.Count; $i += $batchSize) {
    $currentBatch++
    $batch = $migrationsToRepair[$i..([Math]::Min($i + $batchSize - 1, $migrationsToRepair.Count - 1))]
    
    Write-Host "[Batch $currentBatch/$totalBatches] Processing $($batch.Count) migrations..." -ForegroundColor Cyan
    
    foreach ($version in $batch) {
        Write-Host "  Repairing $version..." -NoNewline
        $result = supabase migration repair --status applied $version 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " [OK]" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " [SKIP] (may already exist)" -ForegroundColor Yellow
            $failCount++
        }
        
        # Small delay to avoid rate limiting
        Start-Sleep -Milliseconds 200
    }
    
    Write-Host ""
    
    # Longer delay between batches
    if ($i + $batchSize -lt $migrationsToRepair.Count) {
        Write-Host "Waiting 1 second before next batch..." -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Migration Repair Summary" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Total migrations processed: $($migrationsToRepair.Count)" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed/Skipped: $failCount" -ForegroundColor Yellow
Write-Host ""

# Verify the alignment
Write-Host "Verifying alignment..." -ForegroundColor Cyan
Write-Host ""

$verifyResult = supabase db pull 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] CLI is now aligned!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now use:" -ForegroundColor White
    Write-Host "  supabase db push    - to push new migrations" -ForegroundColor Gray
    Write-Host "  supabase db pull    - to pull remote changes" -ForegroundColor Gray
    Write-Host "  supabase migration up - to apply local migrations" -ForegroundColor Gray
} else {
    Write-Host "[WARN] Verification shows there may still be issues:" -ForegroundColor Yellow
    Write-Host $verifyResult
    Write-Host ""
    Write-Host "You may need to:" -ForegroundColor White
    Write-Host "  1. Check for any remaining migration mismatches" -ForegroundColor Gray
    Write-Host "  2. Run: supabase migration list" -ForegroundColor Gray
    Write-Host "  3. Review the output and fix any remaining issues manually" -ForegroundColor Gray
}

Write-Host ""
