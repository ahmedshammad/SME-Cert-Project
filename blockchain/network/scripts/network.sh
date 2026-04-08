#!/bin/bash
#
# Main network management script for SME Certificate Platform
# Usage: ./network.sh up|down|restart
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$NETWORK_DIR/docker"

COMPOSE_FILE="$DOCKER_DIR/docker-compose-fabric.yaml"
CHANNEL_NAME=${CHANNEL_NAME:-"certificates"}

function printHelp() {
    echo "Usage: $0 <command>"
    echo "Commands:"
    echo "  up        - Start the Fabric network"
    echo "  down      - Stop the Fabric network"
    echo "  restart   - Restart the Fabric network"
    echo "  clean     - Remove all containers, volumes, and crypto material"
}

function networkUp() {
    echo "======================================================================"
    echo " Starting Hyperledger Fabric Network"
    echo "======================================================================"

    # Check if crypto material exists
    if [ ! -d "$NETWORK_DIR/crypto-config" ]; then
        echo "Crypto material not found. Generating..."
        bash "$SCRIPT_DIR/generate_crypto.sh"
    fi

    # Check if channel artifacts exist
    if [ ! -d "$NETWORK_DIR/channel-artifacts" ]; then
        echo "Channel artifacts not found. Generating..."
        bash "$SCRIPT_DIR/generate_artifacts.sh"
    fi

    # Start the network
    echo "Starting Docker containers..."
    docker compose -f "$COMPOSE_FILE" up -d

    # Wait for containers to start
    echo "Waiting for containers to be ready..."
    sleep 15

    # Check container status
    docker compose -f "$COMPOSE_FILE" ps

    echo ""
    echo "======================================================================"
    echo " Network Started Successfully"
    echo "======================================================================"
    echo ""
    echo "Next steps:"
    echo "  For full automated setup: ./bootstrap.sh"
    echo "  Or manually:"
    echo "    1. Create channel:     ./create_channel.sh"
    echo "    2. Deploy chaincode:   ./deploy_chaincode.sh"
    echo "    3. Generate profiles:  ./generate_connection_profiles.sh"
    echo "    4. Create wallets:     ./enroll_admin.sh"
    echo ""
}

function networkDown() {
    echo "======================================================================"
    echo " Stopping Hyperledger Fabric Network"
    echo "======================================================================"

    if [ -f "$COMPOSE_FILE" ]; then
        docker compose -f "$COMPOSE_FILE" down
        echo "Network stopped successfully"
    else
        echo "Docker compose file not found: $COMPOSE_FILE"
    fi

    echo ""
    echo "======================================================================"
    echo " Network Stopped"
    echo "======================================================================"
}

function networkClean() {
    echo "======================================================================"
    echo " Cleaning Hyperledger Fabric Network"
    echo "======================================================================"

    # Stop and remove containers
    if [ -f "$COMPOSE_FILE" ]; then
        docker compose -f "$COMPOSE_FILE" down -v
    fi

    # Remove crypto material
    echo "Removing crypto material..."
    rm -rf "$NETWORK_DIR/crypto-config"

    # Remove channel artifacts
    echo "Removing channel artifacts..."
    rm -rf "$NETWORK_DIR/channel-artifacts"
    rm -rf "$NETWORK_DIR/system-genesis-block"

    # Remove Docker volumes
    echo "Removing Docker volumes..."
    docker volume prune -f

    echo ""
    echo "======================================================================"
    echo " Cleanup Complete"
    echo "======================================================================"
}

function networkRestart() {
    networkDown
    sleep 2
    networkUp
}

# Main script logic
if [ "$#" -lt 1 ]; then
    printHelp
    exit 1
fi

COMMAND=$1

case $COMMAND in
    up)
        networkUp
        ;;
    down)
        networkDown
        ;;
    restart)
        networkRestart
        ;;
    clean)
        networkClean
        ;;
    *)
        echo "Unknown command: $COMMAND"
        printHelp
        exit 1
        ;;
esac
