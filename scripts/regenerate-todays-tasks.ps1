# ============================================================================
# Regenerate Today's Tasks
# ============================================================================
# This script deletes today's tasks and triggers the edge function to regenerate them
# ============================================================================

param(
    [string]$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL,
    [string]$SupabaseAnonKey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY,
    [string]$SupabaseServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

Write-Host "🔄 Regenerating Today's Tasks..." -ForegroundColor Cyan

# Check if required environment variables are set
if (-not $SupabaseUrl) {
    Write-Host "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set" -ForegroundColor Red
    exit 1
}

if (-not $SupabaseAnonKey -and -not $SupabaseServiceKey) {
    Write-Host "❌ Error: Need either NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    exit 1
}

# Use service key if available, otherwise use anon key
$authKey = if ($SupabaseServiceKey) { $SupabaseServiceKey } else { $SupabaseAnonKey }

# Step 1: Delete today's tasks via SQL
Write-Host "`n📋 Step 1: Deleting today's tasks..." -ForegroundColor Yellow

$deleteQuery = @"
DELETE FROM public.checklist_tasks
WHERE due_date = CURRENT_DATE;
"@

# Note: This requires direct database access or using Supabase REST API
# For now, we'll just call the edge function which will handle regeneration
Write-Host "⚠️  Note: Delete today's tasks manually via SQL Editor first" -ForegroundColor Yellow
Write-Host "   Run: DELETE FROM public.checklist_tasks WHERE due_date = CURRENT_DATE;" -ForegroundColor Gray

# Step 2: Call the edge function to regenerate tasks
Write-Host "`n🚀 Step 2: Calling edge function to regenerate tasks..." -ForegroundColor Yellow

$edgeFunctionUrl = "$SupabaseUrl/functions/v1/generate-daily-tasks"

try {
    $response = Invoke-RestMethod -Uri $edgeFunctionUrl -Method POST -Headers @{
        "Authorization" = "Bearer $authKey"
        "Content-Type" = "application/json"
    }

    Write-Host "✅ Task generation completed!" -ForegroundColor Green
    Write-Host "`n📊 Results:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($response.errors -and $response.errors.Count -gt 0) {
        Write-Host "`n⚠️  Warnings/Errors:" -ForegroundColor Yellow
        $response.errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
    
} catch {
    Write-Host "❌ Error calling edge function:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    
    exit 1
}

Write-Host "`n✅ Done! Todays tasks should now be regenerated." -ForegroundColor Green
Write-Host "   Check your Todays Tasks page to verify." -ForegroundColor Gray

