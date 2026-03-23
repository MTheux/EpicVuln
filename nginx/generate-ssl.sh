#!/bin/bash
# Generate self-signed SSL certificate for development
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=BR/ST=SP/L=SaoPaulo/O=VulnControl/CN=localhost"
echo "SSL certificates generated in ./ssl/"
