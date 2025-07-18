#!/bin/bash

# Script pour installer toutes les dépendances des sous-projets
set -e

folders=(
  "admin-portal"
  "backend"
  "client-portal"
  "mobile"
)

for folder in "${folders[@]}"; do
  if [ -f "$folder/package.json" ]; then
    echo "\nInstallation des dépendances dans $folder ..."
    (cd "$folder" && npm install)
  fi
done

echo "\nInstallation des dépendances à la racine ..."
npm install

echo "\n✅ Toutes les dépendances ont été installées."
