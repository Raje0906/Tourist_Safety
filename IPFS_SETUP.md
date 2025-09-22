# 📁 IPFS Setup Guide for Tourist Safety System

## Overview

The Tourist Safety System uses IPFS (InterPlanetary File System) for decentralized document storage. While IPFS is optional for development, it provides enhanced security and decentralization for production deployments.

## ⚠️ Current Status

If you see this error in your logs:
```
IPFS upload failed: TypeError: fetch failed
    at node:internal/deps/undici/undici:13502:13
    [cause]: AggregateError [ECONNREFUSED]
```

This means IPFS is not running, but **your system is still working fine** using the fallback mock storage.

## 🔧 IPFS Installation Options

### Option 1: Quick Setup (Recommended for Development)

Simply disable IPFS in your environment configuration:

```env
# In your .env file
IPFS_ENABLED=false
```

The system will use secure mock storage for development purposes.

### Option 2: Full IPFS Setup (Recommended for Production)

#### Step 1: Install IPFS

**Windows:**
1. Download IPFS from https://ipfs.io/install/
2. Extract to a folder (e.g., `C:\ipfs`)
3. Add to PATH environment variable
4. Open Command Prompt and verify: `ipfs version`

**macOS (using Homebrew):**
```bash
brew install ipfs
```

**Linux (Ubuntu/Debian):**
```bash
# Download latest release
wget https://dist.ipfs.io/kubo/v0.24.0/kubo_v0.24.0_linux-amd64.tar.gz
tar -xzf kubo_v0.24.0_linux-amd64.tar.gz
cd kubo
sudo bash install.sh
```

**Using npm (Cross-platform):**
```bash
npm install -g ipfs
```

#### Step 2: Initialize IPFS

```bash
# Initialize IPFS repository
ipfs init

# Optional: Configure for local development
ipfs config Addresses.API /ip4/127.0.0.1/tcp/5001
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8080
```

#### Step 3: Start IPFS Daemon

```bash
# Start IPFS daemon (keep this running)
ipfs daemon
```

You should see output similar to:
```
Initializing daemon...
go-ipfs version: 0.24.0
Swarm listening on /ip4/127.0.0.1/tcp/4001
API server listening on /ip4/127.0.0.1/tcp/5001
WebUI: http://127.0.0.1:5001/webui
Gateway (readonly) server listening on /ip4/127.0.0.1/tcp/8080
Daemon is ready
```

#### Step 4: Enable IPFS in Your Application

Update your `.env` file:
```env
IPFS_ENABLED=true
IPFS_URL=http://localhost:5001
```

## 🏃‍♂️ Running IPFS as a Service

### Windows (using NSSM)

1. Download NSSM from https://nssm.cc/
2. Install IPFS as a service:
```cmd
nssm install IPFS "C:\path\to\ipfs.exe" daemon
nssm start IPFS
```

### Linux (systemd)

Create a service file:
```bash
sudo nano /etc/systemd/system/ipfs.service
```

Add the following content:
```ini
[Unit]
Description=IPFS daemon
After=network.target

[Service]
Type=notify
User=ipfs
Group=ipfs
Environment=IPFS_PATH=/home/ipfs/.ipfs
ExecStart=/usr/local/bin/ipfs daemon --enable-namesys-pubsub
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ipfs
sudo systemctl start ipfs
sudo systemctl status ipfs
```

### macOS (using launchd)

Create a plist file:
```bash
nano ~/Library/LaunchAgents/io.ipfs.daemon.plist
```

Add the following content:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.ipfs.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ipfs</string>
        <string>daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load the service:
```bash
launchctl load ~/Library/LaunchAgents/io.ipfs.daemon.plist
```

## 📊 Testing IPFS Integration

### Check IPFS Status

Visit the new status endpoint in your browser:
```
http://localhost:5000/api/blockchain/status
```

You should see:
```json
{
  "status": {
    "available": true,
    "blockchain": {
      "connected": false,
      "error": "Blockchain service not initialized"
    },
    "ipfs": {
      "connected": true,
      "enabled": true,
      "version": "0.24.0"
    }
  }
}
```

### Test Document Upload

When you create a tourist profile, check the logs for:
```
✅ Document uploaded to IPFS: QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
✅ Tourist created with blockchain ID: blockchain_xxxxxxxxxxxxxxxxxxxxx
```

## 🐳 Docker Setup (Alternative)

If you prefer using Docker:

```bash
# Run IPFS in Docker
docker run -d --name ipfs_host \
  -v $PWD/ipfs-docker-staging:/export \
  -v $PWD/ipfs-docker-data:/data/ipfs \
  -p 4001:4001 -p 4001:4001/udp \
  -p 127.0.0.1:8080:8080 \
  -p 127.0.0.1:5001:5001 \
  ipfs/kubo:latest

# Check if it's running
docker logs ipfs_host
```

## 🔍 Troubleshooting

### Common Issues

**Issue: "dial tcp 127.0.0.1:5001: connect: connection refused"**
- Solution: IPFS daemon is not running. Start it with `ipfs daemon`

**Issue: "Error: api not running"**
- Solution: Initialize IPFS first with `ipfs init`

**Issue: "permission denied"**
- Solution: Check IPFS directory permissions or run as correct user

**Issue: Port already in use**
- Solution: Change IPFS ports or stop conflicting services

### Verification Commands

```bash
# Check IPFS version
ipfs version

# Check daemon status
ipfs id

# Test file upload
echo "Hello IPFS" | ipfs add

# Check configuration
ipfs config show
```

## 🛡️ Security Considerations

### Production IPFS Configuration

```bash
# Disable public gateway (security)
ipfs config Addresses.Gateway ""

# Configure proper CORS for your domain
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://your-domain.com"]'

# Enable proper authentication
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]'
```

### Network Configuration

For production deployments:
1. Use private IPFS networks for sensitive data
2. Implement proper firewall rules
3. Use IPFS pinning services for redundancy
4. Consider IPFS clustering for high availability

## 📈 Monitoring IPFS

### Health Checks

Add these commands to your monitoring:

```bash
# Check daemon health
ipfs diag sys

# Check peer connections
ipfs swarm peers | wc -l

# Check repository status
ipfs repo stat
```

### Integration with Application

The Tourist Safety System automatically monitors IPFS status and provides:
- Real-time connectivity status via `/api/blockchain/status`
- Automatic fallback to mock storage if IPFS fails
- Detailed error logging for troubleshooting
- Health checks in the admin dashboard

## 🎯 Production Deployment

For production environments:

1. **Use IPFS Pinning Services**: Pin important documents to ensure availability
2. **Implement Backup Strategies**: Regular backups of IPFS data
3. **Monitor Performance**: Track upload/download speeds and success rates
4. **Configure Clustering**: Use IPFS cluster for redundancy
5. **Security Hardening**: Implement proper access controls and encryption

## 📚 Additional Resources

- [IPFS Documentation](https://docs.ipfs.io/)
- [IPFS Best Practices](https://docs.ipfs.io/concepts/best-practices/)
- [IPFS Pinning Services](https://docs.ipfs.io/concepts/persistence/#pinning-services)
- [IPFS Clustering](https://cluster.ipfs.io/)

---

**Remember**: The Tourist Safety System is designed to work seamlessly with or without IPFS. Choose the setup that best fits your deployment requirements!