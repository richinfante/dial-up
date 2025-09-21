#!/bin/bash
set -e

# pack all files into a zip for upload to Chrome Web Store, excluding .git, and any zip files
zip -r dial_up_packed.zip . -x "*.git*" -x "*.zip"