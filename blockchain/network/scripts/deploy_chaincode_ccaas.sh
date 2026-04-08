#!/bin/bash
#
# Deploy chaincode using Chaincode-as-a-Service (CCaaS)
# Builds chaincode externally and runs it as a Docker container.
# Bypasses the peer's Docker builder entirely - no Docker socket needed.
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

# CCaaS settings
CC_IMAGE="sme-cert-chaincode:${CC_VERSION}"
CC_CONTAINER="cc-${CC_NAME}"
CC_PORT=9999

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

ORDERER_CA="$CRYPTO_DIR/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Helper to set peer environment for a given org
setOrgEnv() {
    local ORG_NUM=$1
    local PORT=$2

    export CORE_PEER_LOCALMSPID="Org${ORG_NUM}MSP"
    export CORE_PEER_ADDRESS="localhost:${PORT}"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_DIR/peerOrganizations/org${ORG_NUM}.example.com/peers/peer0.org${ORG_NUM}.example.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_DIR/peerOrganizations/org${ORG_NUM}.example.com/users/Admin@org${ORG_NUM}.example.com/msp"
}

echo "======================================================================"
echo " Deploying Chaincode (CCaaS): $CC_NAME v$CC_VERSION"
echo "======================================================================"

# -------------------------------------------------------------------------
# Step 1: Vendor dependencies and build chaincode Docker image
# -------------------------------------------------------------------------
echo ""
echo "Step 1: Building chaincode Docker image..."

cd "$CHAINCODE_DIR"
echo "  Resolving Go module dependencies..."
GO111MODULE=on go mod tidy 2>&1
echo "  Vendoring Go dependencies..."
GO111MODULE=on go mod vendor 2>&1

echo "  Building Docker image: $CC_IMAGE..."
docker build -t "$CC_IMAGE" -f Dockerfile . 2>&1
echo "  Image built successfully."

# -------------------------------------------------------------------------
# Step 2: Create CCaaS package
# -------------------------------------------------------------------------
echo ""
echo "Step 2: Creating CCaaS package..."

WORK_DIR=$(mktemp -d)

# connection.json - peers connect to this address on fabric_network
cat > "$WORK_DIR/connection.json" <<EOF
{
    "address": "${CC_CONTAINER}:${CC_PORT}",
    "dial_timeout": "10s",
    "tls_required": false
}
EOF

# metadata.json - tells the peer this is a CCaaS chaincode
cat > "$WORK_DIR/metadata.json" <<EOF
{
    "type": "ccaas",
    "label": "${CC_LABEL}"
}
EOF

# Package structure: outer tar contains code.tar.gz + metadata.json
# code.tar.gz contains connection.json
tar -czf "$WORK_DIR/code.tar.gz" -C "$WORK_DIR" connection.json
tar -czf "$NETWORK_DIR/${CC_LABEL}.tar.gz" -C "$WORK_DIR" code.tar.gz metadata.json

rm -rf "$WORK_DIR"
echo "  CCaaS package created: ${CC_LABEL}.tar.gz"

# -------------------------------------------------------------------------
# Step 3: Install chaincode on all endorsing peers
# -------------------------------------------------------------------------
echo ""
echo "Step 3: Installing chaincode on endorsing peers..."

cd "$NETWORK_DIR"
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
    exit 1
fi

# -------------------------------------------------------------------------
# Step 4: Start chaincode container with package ID
# -------------------------------------------------------------------------
echo ""
echo "Step 4: Starting chaincode container..."

# Stop existing chaincode container if running
docker stop "$CC_CONTAINER" 2>/dev/null || true
docker rm "$CC_CONTAINER" 2>/dev/null || true

docker run -d \
    --name "$CC_CONTAINER" \
    --network fabric_network \
    --restart unless-stopped \
    -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:${CC_PORT} \
    -e CORE_CHAINCODE_ID_NAME="${PACKAGE_ID}" \
    "$CC_IMAGE"

echo "  Chaincode container started: $CC_CONTAINER"
echo "  Waiting for chaincode to initialize..."
sleep 5

# Check if container is still running
if ! docker ps --format '{{.Names}}' | grep -q "^${CC_CONTAINER}$"; then
    echo "ERROR: Chaincode container exited unexpectedly. Logs:"
    docker logs "$CC_CONTAINER" 2>&1 | tail -20
    exit 1
fi

echo "  Chaincode container is running."

# -------------------------------------------------------------------------
# Step 5: Approve chaincode for each organization
# -------------------------------------------------------------------------
echo ""
echo "Step 5: Approving chaincode for each organization..."

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
# Step 6: Check commit readiness
# -------------------------------------------------------------------------
echo ""
echo "Step 6: Checking commit readiness..."

setOrgEnv 1 7051

peer lifecycle chaincode checkcommitreadiness \
    --channelID "$CHANNEL_NAME" \
    --name "$CC_NAME" \
    --version "$CC_VERSION" \
    --sequence $CC_SEQUENCE \
    --init-required=false \
    --output json 2>&1

# -------------------------------------------------------------------------
# Step 7: Commit chaincode definition
# -------------------------------------------------------------------------
echo ""
echo "Step 7: Committing chaincode definition..."

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
# Step 8: Verify deployment
# -------------------------------------------------------------------------
echo ""
echo "Step 8: Verifying deployment..."

peer lifecycle chaincode querycommitted \
    --channelID "$CHANNEL_NAME" \
    --name "$CC_NAME" \
    --output json 2>&1

# -------------------------------------------------------------------------
# Step 9: Test with a simple query
# -------------------------------------------------------------------------
echo ""
echo "Step 9: Testing chaincode with a simple invoke..."

peer chaincode query \
    -C "$CHANNEL_NAME" \
    -n "$CC_NAME" \
    -c '{"function":"GetIssuer","Args":["org1-ministry"]}' 2>&1 || {
        echo "  Note: Query returned error (expected for a fresh ledger with no data)"
    }

# Clean up package file
rm -f "$NETWORK_DIR/${CC_LABEL}.tar.gz"

echo ""
echo "======================================================================"
echo " Chaincode Deployment Complete (CCaaS)"
echo "======================================================================"
echo ""
echo "Chaincode:  $CC_NAME"
echo "Version:    $CC_VERSION"
echo "Channel:    $CHANNEL_NAME"
echo "Sequence:   $CC_SEQUENCE"
echo "Container:  $CC_CONTAINER"
echo "Package ID: $PACKAGE_ID"
echo ""
echo "The chaincode runs as an external service (CCaaS)."
echo "To view logs:  docker logs $CC_CONTAINER"
echo "To restart:    docker restart $CC_CONTAINER"
echo ""
