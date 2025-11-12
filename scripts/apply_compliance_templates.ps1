$env:PGPASSWORD = "Stefesti99SB25!"

$psql = "C:\Users\bruce\scoop\apps\postgresql\current\bin\psql.exe"
$supabaseHost = "db.xijoybubtrgbrhquqwrx.supabase.co"
$port = 5432
$user = "postgres"
$database = "postgres"
$psqlArgsBase = @(
  "-h", $supabaseHost,
  "-p", $port,
  "-U", $user,
  "-d", $database,
  "--set", "sslmode=require"
)

$repoRoot = "C:\Users\bruce\my-app"

$templateSeeds = @(
  "seed_fridge_freezer_temperature_template.sql",
  "seed_hot_holding_temperature_template.sql",
  "seed_weekly_pest_control_template.sql",
  "seed_fire_alarm_test_template.sql",
  "seed_first_aid_kit_template.sql",
  "seed_fire_extinguisher_template.sql",
  "seed_extraction_contractor_template.sql",
  "seed_lighting_inspection_template.sql",
  "seed_workplace_inspection_template.sql",
  "seed_training_records_template.sql",
  "seed_training_compliance_management_template.sql",
  "seed_food_labelling_audit_template.sql"
)

Set-Location $repoRoot

foreach ($file in $templateSeeds) {
  $fullPath = Join-Path -Path "supabase\sql\templates" -ChildPath $file
  Write-Host "Applying $file..."
  & $psql @psqlArgsBase -f $fullPath
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to apply $file" -ForegroundColor Red
    break
  }
}

