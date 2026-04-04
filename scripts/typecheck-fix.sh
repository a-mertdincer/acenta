#!/bin/bash
# Pre-push TypeScript kontrol script'i
# Her push öncesi çalıştır: npm run typecheck

set -e

echo "🔍 TypeScript kontrol ediliyor..."

# Önce cache'i temizle
rm -f tsconfig.tsbuildinfo

# tsc çalıştır ve hataları yakala
TSC_OUTPUT=$(npx tsc --noEmit 2>&1) || true

if echo "$TSC_OUTPUT" | grep -q "error TS"; then
  echo "❌ TypeScript hataları bulundu:"
  echo "$TSC_OUTPUT" | grep "error TS"
  echo ""
  echo "Toplam hata sayısı: $(echo "$TSC_OUTPUT" | grep -c "error TS")"
  echo ""
  echo "⚠️  Bu hataları düzeltmeden push yapma!"
  exit 1
else
  echo "✅ TypeScript temiz — hata yok"
fi
