Write-Host "Running Sehat Setu Karnataka Data Pipeline..." -ForegroundColor Cyan
python data/karnataka/scripts/build_karnataka_dataset.py
Write-Host "Pipeline execution complete!" -ForegroundColor Green
