#!/bin/bash
# Deploy wuhu-workspace static site to liu.ms/wuhu

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$REPO_ROOT/dist"
REMOTE_HOST="root@liu.ms"
REMOTE_PATH="/var/www/liu-ms-blog/wuhu"

# Build first if dist doesn't exist or is older than sources
if [ ! -d "$DIST_DIR" ] || [ "$1" = "--build" ]; then
    echo "Building..."
    cd "$REPO_ROOT"
    npm run build
fi

# Create remote directory if needed
ssh "$REMOTE_HOST" "mkdir -p $REMOTE_PATH"

# Rsync with delete to mirror exactly
echo "Deploying to $REMOTE_HOST:$REMOTE_PATH..."
rsync -avz --delete "$DIST_DIR/" "$REMOTE_HOST:$REMOTE_PATH/"

echo "Done! Site live at https://liu.ms/wuhu/"
