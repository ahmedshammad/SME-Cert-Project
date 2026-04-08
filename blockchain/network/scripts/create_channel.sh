#!/bin/bash
#
# Create and join channel using Fabric 2.4 Channel Participation API
# Anchor peers are already embedded in the channel genesis block
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CHANNEL_NAME="${CHANNEL_NAME:-certificates}"
CHANNEL_ARTIFACTS_DIR="$NETWORK_DIR/channel-artifacts"
CRYPTO_DIR="$NETWORK_DIR/crypto-config"

# Set FABRIC_CFG_PATH so the peer CLI can find core.yaml
export FABRIC_CFG_PATH="${FABRIC_CFG_PATH:-$NETWORK_DIR/config}"
if [ ! -f "$FABRIC_CFG_PATH/core.yaml" ]; then
    _PROJECT_ROOT="$(dirname "$(dirname "$NETWORK_DIR")")"
    if [ -f "$_PROJECT_ROOT/config/core.yaml" ]; then
        export FABRIC_CFG_PATH="$_PROJECT_ROOT/config"
    fi
fi

# Ensure channel genesis block exists
if [ ! -f "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block" ]; then
    echo "Channel genesis block not found. Generating..."
    "$SCRIPT_DIR/generate_artifacts.sh"
fi

echo "======================================================================"
echo " Creating and Joining Channel: $CHANNEL_NAME (Fabric 2.4)"
echo "======================================================================"

# -------------------------------------------------------------------------
# Step 1: Join orderers via Channel Participation API (osnadmin)
# -------------------------------------------------------------------------
echo ""
echo "Step 1: Joining orderers to channel via osnadmin..."

joinOrdererToChannel() {
    local ORDERER=$1
    local ADMIN_PORT=$2

    echo "  -> Joining $ORDERER (admin port $ADMIN_PORT)..."

    osnadmin channel join \
        --channelID "$CHANNEL_NAME" \
        --config-block "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block" \
        -o "localhost:$ADMIN_PORT" \
        --ca-file "$CRYPTO_DIR/ordererOrganizations/example.com/orderers/${ORDERER}/msp/tlscacerts/tlsca.example.com-cert.pem" \
        --client-cert "$CRYPTO_DIR/ordererOrganizations/example.com/orderers/${ORDERER}/tls/server.crt" \
        --client-key "$CRYPTO_DIR/ordererOrganizations/example.com/orderers/${ORDERER}/tls/server.key" 2>&1 || {
            echo "  Warning: $ORDERER may already be joined or encountered an error"
        }
}

joinOrdererToChannel "orderer.example.com" "7053"
joinOrdererToChannel "orderer2.example.com" "8053"
joinOrdererToChannel "orderer3.example.com" "9053"

echo "Waiting for orderers to elect leader and sync..."
sleep 5

# -------------------------------------------------------------------------
# Step 2: Join peers to channel
# -------------------------------------------------------------------------
echo ""
echo "Step 2: Joining peers to channel..."

joinPeerToChannel() {
    local ORG_NUM=$1
    local PEER=$2
    local PORT=$3

    echo "  -> Joining peer${PEER}.org${ORG_NUM}.example.com to channel..."

    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org${ORG_NUM}MSP"
    export CORE_PEER_ADDRESS="localhost:${PORT}"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_DIR/peerOrganizations/org${ORG_NUM}.example.com/peers/peer${PEER}.org${ORG_NUM}.example.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_DIR/peerOrganizations/org${ORG_NUM}.example.com/users/Admin@org${ORG_NUM}.example.com/msp"

    peer channel join -b "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block" 2>&1 || {
        echo "  Warning: peer${PEER}.org${ORG_NUM} may already be joined"
    }
}

# Org1 - Ministry of Trade and Industry
joinPeerToChannel 1 0 7051
joinPeerToChannel 1 1 8051

# Org2 - MSMEDA
joinPeerToChannel 2 0 9051
joinPeerToChannel 2 1 10051

# Org3 - Training Providers
joinPeerToChannel 3 0 11051
joinPeerToChannel 3 1 12051

# Org4 - Auditors
joinPeerToChannel 4 0 13051
joinPeerToChannel 4 1 14051

# -------------------------------------------------------------------------
# Step 3: Verify
# -------------------------------------------------------------------------
echo ""
echo "Step 3: Verifying channel membership..."

for ORG_NUM in 1 2 3 4; do
    if [ "$ORG_NUM" == "1" ]; then PORT=7051;
    elif [ "$ORG_NUM" == "2" ]; then PORT=9051;
    elif [ "$ORG_NUM" == "3" ]; then PORT=11051;
    else PORT=13051; fi

    export CORE_PEER_LOCALMSPID="Org${ORG_NUM}MSP"
    export CORE_PEER_ADDRESS="localhost:${PORT}"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_DIR/peerOrganizations/org${ORG_NUM}.example.com/peers/peer0.org${ORG_NUM}.example.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_DIR/peerOrganizations/org${ORG_NUM}.example.com/users/Admin@org${ORG_NUM}.example.com/msp"

    echo "  Org${ORG_NUM} channels:"
    peer channel list 2>&1 | grep -v "^20" || true
done

echo ""
echo "======================================================================"
echo " Channel '$CHANNEL_NAME' Created Successfully"
echo "======================================================================"
echo ""
echo "Organizations: 4 (Org1, Org2, Org3, Org4)"
echo "Peers per org: 2 (8 total)"
echo "Orderers: 3 (Raft consensus)"
echo ""
