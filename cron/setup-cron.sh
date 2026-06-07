#!/bin/bash
# =============================================================================
# HIM Marketplace — Nightly Sync Cron Setup
# =============================================================================
# Installs a cron job to run the nightly-sync script every day at 1:00 AM KL
# (which is 17:00 UTC, since KL = UTC+8).
#
# USAGE:
#   chmod +x cron/setup-cron.sh
#   ./cron/setup-cron.sh
#
# To verify the cron is installed:
#   crontab -l
#
# To remove the cron:
#   crontab -l | grep -v "nightly-sync" | crontab -
# =============================================================================

# Resolve the absolute path to this project
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_DIR/logs/nightly-sync.log"
NPM_BIN="$(which npm)"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

echo "=============================================="
echo "  HIM Marketplace — Nightly Sync Cron Setup"
echo "=============================================="
echo ""
echo "  Project:  $PROJECT_DIR"
echo "  Log file: $LOG_FILE"
echo "  npm:      $NPM_BIN"
echo ""

# Build the cron command
# Runs at 17:00 UTC every day = 1:00 AM KL (GMT+8)
CRON_JOB="0 17 * * * cd $PROJECT_DIR && $NPM_BIN run db:nightly-sync >> $LOG_FILE 2>&1"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "nightly-sync"; then
    echo "⚠️  A nightly-sync cron already exists. Replacing it..."
    # Remove old entry and add new one
    (crontab -l 2>/dev/null | grep -v "nightly-sync"; echo "$CRON_JOB") | crontab -
else
    # Add new cron entry
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
fi

echo "✅ Cron installed successfully!"
echo ""
echo "  Schedule: Every day at 1:00 AM KL time (17:00 UTC)"
echo "  Command:  cd $PROJECT_DIR && npm run db:nightly-sync"
echo "  Logs:     $LOG_FILE"
echo ""
echo "Current crontab:"
echo "----------------------------------------------"
crontab -l
echo "----------------------------------------------"
echo ""
echo "Done. To test manually: npm run db:nightly-sync"
