# 🔧 Troubleshooting Guide

## Quick Fixes for Common Issues

### ❌ IPFS Connection Failed

**Error Message:**
```
IPFS upload failed: TypeError: fetch failed
    at node:internal/deps/undici/undici:13502:13
    [cause]: AggregateError [ECONNREFUSED]
```

**Quick Fix:**
1. Open your `.env` file
2. Add or update this line:
   ```env
   IPFS_ENABLED=false
   ```
3. Restart your application with `npm run dev`

**System Status:** ✅ Your application will continue working normally with mock document storage.

### ❌ MongoDB Connection Failed

**Error Message:**
```
Failed to connect to MongoDB
```

**Quick Fixes:**
1. **Check if MongoDB is running:**
   - Windows: Check Services or start MongoDB manually
   - macOS/Linux: `sudo systemctl start mongod` or `brew services start mongodb`

2. **Update connection string in `.env`:**
   ```env
   MONGODB_URL=mongodb://localhost:27017/tourist_safety
   ```

3. **Use MongoDB Atlas (cloud):**
   ```env
   MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/tourist_safety
   ```

### ❌ Blockchain Service Not Available

**Error Message:**
```
Blockchain service not initialized
```

**Quick Fix:**
1. This is normal for development - the system uses fallback mock blockchain
2. To check status: Visit `http://localhost:5000/api/blockchain/status`
3. System continues working with mock blockchain implementation

### ❌ Port Already in Use

**Error Message:**
```
EADDRINUSE: address already in use :::5000
```

**Quick Fix:**
1. Change port in `.env`:
   ```env
   PORT=3000
   ```
2. Or kill the process using the port:
   - Windows: `netstat -ano | findstr :5000` then `taskkill /PID <PID> /F`
   - macOS/Linux: `lsof -ti:5000 | xargs kill -9`

## 🏥 System Health Check

Run the automated health check:
```bash
npm run health-check
```

This will check:
- ✅ Environment variables
- ✅ MongoDB connection
- ✅ IPFS availability (optional)
- ✅ Blockchain connection (optional)

## 🔍 Service Status API

Check real-time system status:
```bash
curl http://localhost:5000/api/blockchain/status
```

Expected response when everything works:
```json
{
  "status": {
    "available": true,
    "blockchain": {
      "connected": false,
      "error": "Blockchain service not initialized"
    },
    "ipfs": {
      "connected": false,
      "enabled": false,
      "error": "IPFS disabled"
    }
  }
}
```

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Check system health
npm run health-check

# 4. Start application
npm run dev
```

## 🔧 Environment Variables Quick Reference

**Required:**
```env
ENCRYPTION_KEY=your-secure-key-here
SESSION_SECRET=your-session-secret
```

**Database:**
```env
MONGODB_URL=mongodb://localhost:27017/tourist_safety
```

**Optional Services:**
```env
IPFS_ENABLED=false
ETHEREUM_RPC_URL=http://localhost:8545
TOURIST_ID_CONTRACT_ADDRESS=
```

## 🆘 Still Having Issues?

1. **Check the logs** - Look for specific error messages
2. **Run health check** - `npm run health-check`
3. **Check service status** - Visit `/api/blockchain/status`
4. **Review documentation** - `README.md` and `IPFS_SETUP.md`
5. **Start fresh** - Delete `node_modules`, run `npm install`

## 💡 Pro Tips

- **IPFS is optional** - System works fine without it
- **Blockchain is optional** - Mock implementation is used for development
- **MongoDB is required** - But you can use free MongoDB Atlas
- **Check service status** - Use the built-in health check endpoint

---

**Remember:** The Tourist Safety System is designed with robust fallback mechanisms. Even if some services aren't available, the core functionality continues to work!