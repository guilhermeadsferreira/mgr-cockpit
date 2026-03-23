#!/usr/bin/env bash
set -euo pipefail

# ─── Pulse Cockpit — Release Script ───────────────────────────────────────────
# Uso: npm run release -- patch|minor|major
# Exemplo: npm run release -- patch   → 0.1.0 → 0.1.1
#          npm run release -- minor   → 0.1.0 → 0.2.0
#          npm run release -- major   → 0.1.0 → 1.0.0

BUMP="${1:-}"

if [[ -z "$BUMP" ]]; then
  echo "Uso: npm run release -- patch|minor|major"
  exit 1
fi

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Tipo inválido: '$BUMP'. Use patch, minor ou major."
  exit 1
fi

# ── 1. Garantir working tree limpo ────────────────────────────────────────────
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Erro: há mudanças não commitadas. Faça commit antes de fazer release."
  git status --short
  exit 1
fi

# ── 2. Bump de versão ─────────────────────────────────────────────────────────
CURRENT=$(node -p "require('./package.json').version")
NEW=$(npx --yes semver -i "$BUMP" "$CURRENT")

echo "Versão: $CURRENT → $NEW"

# Atualiza package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  pkg.version = '$NEW';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# ── 3. Commit + tag ───────────────────────────────────────────────────────────
git add package.json
git commit -m "chore(release): v$NEW"
git tag "v$NEW"

echo "Commit e tag v$NEW criados."

# ── 4. Build ──────────────────────────────────────────────────────────────────
echo "Buildando..."
npm run package

# ── 5. GitHub Release ─────────────────────────────────────────────────────────
echo "Criando release v$NEW no GitHub..."

ASSETS=()
while IFS= read -r f; do
  ASSETS+=("$f")
done < <(find dist -maxdepth 1 \( -name "*.dmg" -o -name "*.blockmap" -o -name "latest-mac.yml" \))

gh release create "v$NEW" \
  --title "v$NEW" \
  --notes "Release v$NEW" \
  "${ASSETS[@]}"

# ── 6. Push ───────────────────────────────────────────────────────────────────
git push && git push --tags

echo ""
echo "✓ Release v$NEW publicada com sucesso."
echo "  https://github.com/guilhermeadsferreira/Pulse-Cockpit/releases/tag/v$NEW"
