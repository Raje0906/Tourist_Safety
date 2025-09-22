# 🛡️ Tourist Safety Monitoring System

## Overview

A comprehensive digital ecosystem for tourist safety monitoring, incident response, and blockchain-secured digital identity management.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or cloud)
- Optional: Local blockchain network (Hardhat/Ganache)
- Optional: IPFS node for document storage

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd TouristSafeGuard
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Database
MONGODB_URL=mongodb://localhost:27017/tourist_safety

# Blockchain (optional)
ETHEREUM_RPC_URL=http://localhost:8545
TOURIST_ID_CONTRACT_ADDRESS=
ADMIN_PRIVATE_KEY=

# IPFS Configuration
IPFS_URL=http://localhost:5001
IPFS_ENABLED=false  # Set to true only if you have IPFS running

# Security
ENCRYPTION_KEY=your-secure-encryption-key-change-in-production
SESSION_SECRET=your-secure-session-secret

# Application
PORT=5000
NODE_ENV=development
```

### Running the Application

```bash
# Development mode with hot reload
npm run dev

# Production build and start
npm run build
npm start
```

The application will be available at `http://localhost:5000`

## 📋 Features

### Core Features
- 🆔 **Digital Identity Management** - Blockchain-secured tourist IDs
- 🚨 **Emergency Response System** - Real-time incident reporting and tracking
- 🧠 **AI Anomaly Detection** - Behavioral pattern analysis for safety
- 📝 **Electronic FIR System** - Digital incident report filing
- 📊 **Admin Dashboard** - Comprehensive monitoring and analytics
- 🔐 **Secure Authentication** - Multi-level user access control

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Blockchain**: Ethereum (ethers.js), Solidity Smart Contracts
- **Storage**: IPFS for decentralized document storage
- **Real-time**: WebSocket for live updates

## 🔧 Configuration Guide

### IPFS Setup (Optional)

The system can work without IPFS, but for production deployments with document storage:

1. **Install IPFS**:
   ```bash
   # Download from https://ipfs.io/install/
   # Or using package manager:
   npm install -g ipfs
   ```

2. **Initialize and start IPFS**:
   ```bash
   ipfs init
   ipfs daemon
   ```

3. **Enable IPFS in your .env**:
   ```env
   IPFS_ENABLED=true
   IPFS_URL=http://localhost:5001
   ```

### Blockchain Setup (Optional)

For development with local blockchain:

```bash
# Start local blockchain
npm run blockchain:node

# Deploy contracts (in another terminal)
npm run blockchain:deploy:local

# Update .env with contract address
ETHEREUM_RPC_URL=http://localhost:8545
TOURIST_ID_CONTRACT_ADDRESS=<deployed_contract_address>
```

### MongoDB Setup

**Option 1: Local MongoDB**
```bash
# Install MongoDB and start service
sudo systemctl start mongod

# Use in .env
MONGODB_URL=mongodb://localhost:27017/tourist_safety
```

**Option 2: MongoDB Atlas (Cloud)**
```env
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/tourist_safety
```

## 🎯 Usage Guide

### For Tourists
1. **Registration**: Complete digital ID creation with KYC documents
2. **Trip Planning**: Set travel dates and itinerary
3. **Emergency Access**: Use panic button for immediate help
4. **Location Sharing**: Real-time location updates for safety

### For Authorities
1. **Monitoring Dashboard**: View active tourists and incidents
2. **Emergency Response**: Respond to emergency incidents
3. **Tourist Verification**: Verify tourist profiles and documents
4. **Analytics**: Access safety statistics and trends

### For Administrators
1. **System Management**: Monitor system health and performance
2. **User Management**: Manage users, tourists, and authorities
3. **Blockchain Status**: Monitor blockchain and IPFS connectivity
4. **Analytics Dashboard**: Comprehensive system analytics

## 🔍 API Endpoints

### Authentication
- `POST /api/auth/tourist/signin` - Tourist login
- `POST /api/auth/admin/signin` - Admin/Authority login

### Tourist Management
- `POST /api/tourists` - Create tourist profile
- `GET /api/tourists/user/:userId` - Get tourist by user ID
- `PATCH /api/tourists/:id` - Update tourist profile
- `POST /api/tourists/check-digital-id` - Validate digital ID

### Emergency System
- `POST /api/emergencies` - Report emergency incident
- `GET /api/emergencies` - Get all incidents
- `PATCH /api/emergencies/:id` - Update incident status

### Blockchain Services
- `GET /api/blockchain/status` - Check blockchain and IPFS status
- `POST /api/blockchain/verify-identity` - Verify tourist identity
- `POST /api/blockchain/verify-profile` - Admin profile verification

## 🚨 Troubleshooting

### Common Issues

**IPFS Connection Failed**
```
IPFS upload failed: TypeError: fetch failed
```
**Solution**: Either start IPFS daemon or set `IPFS_ENABLED=false` in .env

**MongoDB Connection Error**
```
Failed to connect to MongoDB
```
**Solution**: Ensure MongoDB is running and connection string is correct

**Blockchain Connection Failed**
```
Blockchain service not initialized
```
**Solution**: Start local blockchain or use testnet, update contract address

### Service Status Check

Visit `/api/blockchain/status` to check system health:

```json
{
  "status": {
    "available": true,
    "blockchain": {
      "connected": true,
      "network": "localhost"
    },
    "ipfs": {
      "connected": false,
      "enabled": false,
      "error": "IPFS disabled"
    }
  }
}
```

## 🔒 Security Considerations

- **Encryption**: All sensitive data encrypted with AES-256-GCM
- **Blockchain**: Immutable digital identity records
- **Access Control**: Role-based permissions (Tourist/Authority/Admin)
- **Data Privacy**: Personal data encrypted, only hashes on blockchain
- **Session Security**: Secure session management with proper secrets

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the troubleshooting section above
- Review API endpoint documentation
- Check service status at `/api/blockchain/status`
- Create an issue in the repository

---

**Note**: This system uses fallback mechanisms for all external services (IPFS, Blockchain). The core functionality works even when optional services are unavailable.