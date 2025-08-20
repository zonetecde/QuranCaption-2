# Script pour supprimer tous les fichiers présents dans QC2 mais absents de QC3
Write-Host "Nettoyage des fichiers résiduels de QuranCaption-2..." -ForegroundColor Green

# Chemin vers QuranCaption-3 pour comparaison
$qc3Path = "../QuranCaption-3"
$qc2Path = "."

# Obtenir tous les fichiers de QC3 (relativement à la racine)
Write-Host "Analyse des fichiers dans QuranCaption-3..." -ForegroundColor Yellow
$qc3Files = @()
if (Test-Path $qc3Path) {
    Get-ChildItem -Path $qc3Path -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Replace((Resolve-Path $qc3Path).Path + "\", "")
        $qc3Files += $relativePath
    }
}

# Obtenir tous les fichiers de QC2 (relativement à la racine)
Write-Host "Analyse des fichiers dans QuranCaption-2-merged..." -ForegroundColor Yellow
$qc2Files = @()
Get-ChildItem -Path $qc2Path -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Replace((Get-Location).Path + "\", "")
    # Ignorer certains dossiers/fichiers système
    if ($relativePath -notmatch "^\.git" -and 
        $relativePath -notmatch "^node_modules" -and 
        $relativePath -notmatch "^\.svelte-kit" -and
        $relativePath -notmatch "^target" -and
        $relativePath -notmatch "cleanup-qc2-files\.ps1$") {
        $qc2Files += $relativePath
    }
}

# Trouver les fichiers à supprimer (présents dans QC2 mais pas dans QC3)
$filesToDelete = @()
foreach ($qc2File in $qc2Files) {
    if ($qc3Files -notcontains $qc2File) {
        $filesToDelete += $qc2File
    }
}

Write-Host "`nFichiers à supprimer:" -ForegroundColor Red
$filesToDelete | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }

if ($filesToDelete.Count -eq 0) {
    Write-Host "`nAucun fichier résiduel trouvé !" -ForegroundColor Green
    exit 0
}

# Supprimer automatiquement sans demander confirmation (pour l'automatisation)
Write-Host "`nSuppression des $($filesToDelete.Count) fichiers..." -ForegroundColor Green

foreach ($file in $filesToDelete) {
    try {
        if (Test-Path $file) {
            Remove-Item $file -Force
            Write-Host "  ✓ Supprimé: $file" -ForegroundColor Green
            
            # Supprimer avec git si le fichier est tracký
            git rm --cached $file 2>$null
        }
    }
    catch {
        Write-Host "  ✗ Erreur lors de la suppression de: $file" -ForegroundColor Red
    }
}

Write-Host "`nNettoyage terminé !" -ForegroundColor Green
