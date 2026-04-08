#!/bin/bash
#
# Generate crypto material for the Hyperledger Fabric network
# Uses cryptogen tool to generate certificates and keys
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$NETWORK_DIR/config"
CRYPTO_DIR="$NETWORK_DIR/crypto-config"

# Ensure Fabric binaries are in PATH
export PATH="$PATH:/usr/local/bin"

echo "======================================================================"
echo " Generating Crypto Material for SME Certificate Platform Network"
echo "======================================================================"

# Remove existing crypto material
if [ -d "$CRYPTO_DIR" ]; then
    echo "Removing existing crypto material..."
    rm -rf "$CRYPTO_DIR"
fi

# Generate crypto material using cryptogen
echo "Generating certificates using cryptogen..."
cryptogen generate --config="$CONFIG_DIR/crypto-config.yaml" --output="$CRYPTO_DIR"

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate crypto material"
    exit 1
fi

echo ""
echo "Crypto material generated successfully!"
echo "Location: $CRYPTO_DIR"
echo ""

# Create directory structure for connection profiles
mkdir -p "$NETWORK_DIR/connection-profiles"

echo "======================================================================"
echo " Crypto Generation Complete"
echo "======================================================================"
