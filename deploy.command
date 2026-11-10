#!/bin/bash
# Fuel Ledger: double-click on a Mac to deploy. Needs Node.js 18 or newer.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Install it from https://nodejs.org (LTS installer), or with Homebrew:  brew install node"
  echo "Then run this again."
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi
node deploy.mjs "$@"
echo
read -n 1 -s -r -p "Press any key to close."
