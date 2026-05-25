#!/bin/bash
STATIC_DIR="/var/www/api.putforshare.com/backend/static"

sudo chown -R ubuntu:www-data "$STATIC_DIR"
sudo find "$STATIC_DIR" -type d -exec chmod 755 {} \;
sudo find "$STATIC_DIR" -type f -exec chmod 644 {} \;

echo "Permissions fixed for $STATIC_DIR"
