#!/bin/bash
#
# Deploy chaincode to all peers using Fabric 2.5 Lifecycle
# Installs, approves, and commits the certificate_contract chaincode
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CRYPTO_DIR="$NETWORK_DIR/crypto-config"
CHAINCODE_DIR="$(dirname "$NETWORK_DIR")/chaincode/certificate_contract"

CHANNEL_NAME="${CHANNEL_NAME:-certificates}"
CC_NAME="${CC_NAME:-certificate_contract}"
CC_VERSION="${CC_VERSION:-1.0}"
CC_SEQUENCE="${CC_SEQUENCE:-1}"
CC_LABEL="${CC_NAME}_${CC_VERSION}"

# Ensure Fabric binaries are in PATH
export PATH="$PATH:/usr/local/bin"
export CORE_PEER_TLS_ENABLED=true

# Set FABRIC_CFG_PATH so the peer CLI can find core.yaml
export FABRIC_CFG_PATH="${FABRIC_CFG_PATH:-$NETWORK_DIR/config}"
if [ ! -f "$FABRIC_CFG_PATH/core.yaml" ]; then
    _PROJECT_ROOT="$(dirname "$(dirname "$NETWORK_DIR")")"
    if [ -f "$_PROJECT_ROOT/config/core.yaml" ]; then
        export FABRIC_CFG_PATH="$_PROJECT_ROOT/config"
    fi
fi

if ! command -v peer &> /dev/null; then
    echo "ERROR: peer binary not found in PATH"
    exit 1
fi

echo "======================================================================"
echo " Deploying Chaincode: $CC_NAME v$CC_VERSION"
echo "======================================================================"

# Helper to set peer environment for a given org
setOrgEnv() {
    local ORG_NUM=$1
    local PORT=$2

    export CORE_PEER_LOCALMSPID="Org${ORG_NUM}MSP"
    export CORE_PEER_ADDRESS="localhost:${PORT}"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_DIR/peerOrganizations/org${ORG_NUM}.example.com/peers/peer0.org${ORG_NUM}.example.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_DIR/peerOrganizations/org${ORG_NUM}.example.com/users/Admin@org${ORG_NUM}.example.com/msp"
}

ORDERER_CA="$CRYPTO_DIR/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# -------------------------------------------------------------------------
# Step 1: Vendor Go dependencies and package chaincode
# -------------------------------------------------------------------------
echo ""
echo "Step 1: Packaging chaincode..."

cd "$CHAINCODE_DIR"
echo "  Resolving Go module dependencies..."
GO111MODULE=on go mod tidy 2>&1
echo "  Vendoring Go dependencies..."
GO111MODULE=on go mod vendor 2>&1

cd "$NETWORK_DIR"

# Package the chaincode
peer lifecycle chaincode package "${CC_LABEL}.tar.gz" \
    --path "$CHAINCODE_DIR" \
    --lang golang \
    --label "$CC_LABEL"

echo "  Chaincode packaged: ${CC_LABEL}.tar.gz"

# -------------------------------------------------------------------------
# Step 2: Install chaincode on all endorsing peers (peer0 of each org)
# -------------------------------------------------------------------------
echo ""
echo "Step 2: Installing chaincode on endorsing peers..."

PACKAGE_ID=""

for ORG_NUM in 1 2 3 4; do
    if [ "$ORG_NUM" == "1" ]; then PORT=7051;
    elif [ "$ORG_NUM" == "2" ]; then PORT=9051;
    elif [ "$ORG_NUM" == "3" ]; then PORT=11051;
    else PORT=13051; fi

    setOrgEnv "$ORG_NUM" "$PORT"

    echo "  Installing on peer0.org${ORG_NUM}..."
    peer lifecycle chaincode install "${CC_LABEL}.tar.gz" 2>&1

    # Get package ID from the first org
    if [ -z "$PACKAGE_ID" ]; then
        PACKAGE_ID=$(peer lifecycle chaincode queryinstalled 2>&1 | grep "$CC_LABEL" | sed -n 's/.*Package ID: //p' | sed 's/,.*//' | head -1)
        # Fallback parsing
        if [ -z "$PACKAGE_ID" ]; then
            PACKAGE_ID=$(peer lifecycle chaincode queryinstalled 2>&1 | grep "$CC_LABEL" | awk -F'[, ]+' '{print $3}')
        fi
        echo "  Package ID: $PACKAGE_ID"
    fi
done

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Failed to get chaincode package ID"
    echo "Try running: peer lifecycle chaincode queryinstalled"
    exit 1
fi

# -------------------------------------------------------------------------
# Step 3: Approve chaincode for each organization
# -------------------------------------------------------------------------
echo ""
echo "Step 3: Approving chaincode for each organization..."

for ORG_NUM in 1 2 3 4; do
    if [ "$ORG_NUM" == "1" ]; then PORT=7051;
    elif [ "$ORG_NUM" == "2" ]; then PORT=9051;
    elif [ "$ORG_NUM" == "3" ]; then PORT=11051;
    else PORT=13051; fi

    setOrgEnv "$ORG_NUM" "$PORT"

    echo "  Approving for Org${ORG_NUM}MSP..."
    peer lifecycle chaincode approveformyorg \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls --cafile "$ORDERER_CA" \
        --channelID "$CHANNEL_NAME" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --package-id "$PACKAGE_ID" \
        --sequence $CC_SEQUENCE \
        --init-required=false 2>&1
done

# -------------------------------------------------------------------------
# Step 4: Check commit readiness
# -------------------------------------------------------------------------
echo ""
echo "Step 4: Checking commit readiness..."

setOrgEnv 1 7051

peer lifecycle chaincode checkcommitreadiness \
    --channelID "$CHANNEL_NAME" \
    --name "$CC_NAME" \
    --version "$CC_VERSION" \
    --sequence $CC_SEQUENCE \
    --init-required=false \
    --output json 2>&1

# -------------------------------------------------------------------------
# Step 5: Commit chaincode definition
# -------------------------------------------------------------------------
echo ""
echo "Step 5: Committing chaincode definition..."

setOrgEnv 1 7051

peer lifecycle chaincode commit \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile "$ORDERER_CA" \
    --channelID "$CHANNEL_NAME" \
    --name "$CC_NAME" \
    --version "$CC_VERSION" \
    --sequence $CC_SEQUENCE \
    --init-required=false \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles "$CRYPTO_DIR/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles "$CRYPTO_DIR/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
    --peerAddresses localhost:11051 \
    --tlsRootCertFiles "$CRYPTO_DIR/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt" \
    --peerAddresses localhost:13051 \
    --tlsRootCertFiles "$CRYPTO_DIR/peerOrganizations/org4.example.com/peers/peer0.org4.example.com/tls/ca.crt" 2>&1

# -------------------------------------------------------------------------
# Step 6: Verify deployment
# -------------------------------------------------------------------------
echo ""
echo "Step 6: Verifying deployment..."

peer lifecycle chaincode querycommitted \
    --channelID "$CHANNEL_NAME" \
    --name "$CC_NAME" \
    --output json 2>&1

# -------------------------------------------------------------------------
# Step 7: Test with a simple query
# -------------------------------------------------------------------------
echo ""
echo "Step 7: Testing chaincode with a simple invoke..."

peer chaincode query \
    -C "$CHANNEL_NAME" \
    -n "$CC_NAME" \
    -c '{"function":"GetIssuer","Args":["org1-ministry"]}' 2>&1 || {
        echo "  Note: Query returned empty (expected for a fresh ledger)"
    }

# Clean up package file
rm -f "$NETWORK_DIR/${CC_LABEL}.tar.gz"

echo ""
echo "======================================================================"
echo " Chaincode Deployment Complete"
echo "======================================================================"
echo ""
echo "Chaincode: $CC_NAME"
echo "Version: $CC_VERSION"
echo "Channel: $CHANNEL_NAME"
echo "Sequence: $CC_SEQUENCE"
echo "Endorsing peers: peer0.org1, peer0.org2, peer0.org3, peer0.org4"
echo ""
