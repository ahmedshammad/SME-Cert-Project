#!/bin/bash
#
# Create and join channel using Fabric 2.4 Channel Participation API
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CHANNEL_NAME=${CHANNEL_NAME:-"certificates"}
CHANNEL_ARTIFACTS_DIR="$NETWORK_DIR/channel-artifacts"

echo "======================================================================"
echo " Creating and Joining Channel: $CHANNEL_NAME (Fabric 2.4 Method)"
echo "======================================================================"

# Create channel genesis block
echo "Step 1: Creating channel genesis block..."
cd "$NETWORK_DIR"

export FABRIC_CFG_PATH="$NETWORK_DIR/config"

# Generate channel creation transaction if it doesn't exist
if [ ! -f "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.tx" ]; then
    echo "Channel transaction not found, generating..."
    configtxgen -profile FourOrgChannel \
        -outputCreateChannelTx "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.tx" \
        -channelID "$CHANNEL_NAME"
fi

# Create genesis block from the channel transaction
configtxgen -profile FourOrgChannel \
    -outputBlock "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block" \
    -channelID "$CHANNEL_NAME"

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate channel genesis block"
    exit 1
fi

echo "Channel genesis block created successfully"

# Function to join orderer to channel using osnadmin
joinOrdererToChannel() {
    local ORDERER=$1
    local PORT=$2

    echo "Joining $ORDERER to channel..."

    docker exec cli osnadmin channel join \
        --channelID "$CHANNEL_NAME" \
        --config-block "/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block" \
        -o "$ORDERER:$PORT" \
        --ca-file "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/${ORDERER}/msp/tlscacerts/tlsca.example.com-cert.pem" \
        --client-cert "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/${ORDERER}/tls/server.crt" \
        --client-key "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/${ORDERER}/tls/server.key" || {
            echo "Warning: $ORDERER may already be joined or encountered an error"
        }
}

echo ""
echo "Step 2: Joining orderers to channel using channel participation API..."

# Join all orderers to the channel
joinOrdererToChannel "orderer.example.com" "7053"
joinOrdererToChannel "orderer2.example.com" "8053"
joinOrdererToChannel "orderer3.example.com" "9053"

# Wait for orderers to be ready
echo "Waiting for orderers to sync..."
sleep 5

echo ""
echo "Step 3: Joining peers to channel..."

# Function to join peer to channel
joinPeerToChannel() {
    local ORG=$1
    local PEER=$2
    local PORT=$3
    local MSP_ID="${ORG}MSP"

    echo "Joining ${ORG} ${PEER} to channel..."

    docker exec -e CORE_PEER_LOCALMSPID="$MSP_ID" \
        -e CORE_PEER_ADDRESS="${PEER}.${ORG}.example.com:${PORT}" \
        -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${ORG}.example.com/peers/${PEER}.${ORG}.example.com/tls/ca.crt" \
        -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${ORG}.example.com/users/Admin@${ORG}.example.com/msp" \
        cli peer channel join \
        -b "/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block"
}

# Join Org1 peers
joinPeerToChannel "org1" "peer0" "7051"
joinPeerToChannel "org1" "peer1" "8051"

# Join Org2 peers
joinPeerToChannel "org2" "peer0" "9051"
joinPeerToChannel "org2" "peer1" "10051"

# Join Org3 peers
joinPeerToChannel "org3" "peer0" "11051"
joinPeerToChannel "org3" "peer1" "12051"

# Join Org4 peers
joinPeerToChannel "org4" "peer0" "13051"
joinPeerToChannel "org4" "peer1" "14051"

echo ""
echo "Step 4: Updating anchor peers..."

ORDERER_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Update anchor peers for each org
for ORG_NUM in 1 2 3 4; do
    echo "Updating anchor peer for Org${ORG_NUM}..."

    if [ "$ORG_NUM" == "1" ]; then
        PORT="7051"
    elif [ "$ORG_NUM" == "2" ]; then
        PORT="9051"
    elif [ "$ORG_NUM" == "3" ]; then
        PORT="11051"
    else
        PORT="13051"
    fi

    docker exec -e CORE_PEER_LOCALMSPID="Org${ORG_NUM}MSP" \
        -e CORE_PEER_ADDRESS="peer0.org${ORG_NUM}.example.com:${PORT}" \
        -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org${ORG_NUM}.example.com/peers/peer0.org${ORG_NUM}.example.com/tls/ca.crt" \
        -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org${ORG_NUM}.example.com/users/Admin@org${ORG_NUM}.example.com/msp" \
        cli peer channel update \
        -o orderer.example.com:7050 \
        -c "$CHANNEL_NAME" \
        -f "/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org${ORG_NUM}MSPanchors.tx" \
        --tls --cafile "$ORDERER_CA" || {
            echo "Warning: Anchor peer update for Org${ORG_NUM} may have failed"
        }
done

echo ""
echo "======================================================================"
echo " Channel Created and All Peers Joined Successfully"
echo "======================================================================"
echo ""
echo "Channel: $CHANNEL_NAME"
echo "Organizations: 4 (Org1, Org2, Org3, Org4)"
echo "Peers per org: 2"
echo ""
