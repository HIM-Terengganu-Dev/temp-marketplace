#!/bin/bash
# Keep-alive script to run localtunnel in the background persistently

echo "Starting localtunnel keep-alive loop..."
while true; do
  echo "Starting localtunnel on port 3000..."
  npx localtunnel --port 3000 --subdomain him-marketplace-sandbox
  echo "Localtunnel process exited. Restarting in 5 seconds..."
  sleep 5
done
