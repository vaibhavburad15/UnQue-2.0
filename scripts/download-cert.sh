#!/usr/bin/env bash
set -euo pipefail
CERT_DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"
CERT_FILE="${CERT_DIR}/global-bundle.pem"
mkdir -p "$CERT_DIR"
echo "[cert] Downloading AWS global TLS bundle..."
wget -q -O "$CERT_FILE" "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"
echo "[cert] Saved to $CERT_FILE"
