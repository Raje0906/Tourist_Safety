#!/usr/bin/env node

/**
 * System Health Check Script for Tourist Safety System
 * This script checks the status of all system components
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ethers } from 'ethers';

// Load environment variables
dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (color, message) => console.log(`${color}${message}${colors.reset}`);
const logSuccess = (message) => log(colors.green, `✅ ${message}`);
const logError = (message) => log(colors.red, `❌ ${message}`);
const logWarning = (message) => log(colors.yellow, `⚠️  ${message}`);
const logInfo = (message) => log(colors.blue, `ℹ️  ${message}`);

async function checkMongoDB() {
  logInfo('Checking MongoDB connection...');
  
  const mongoUrl = process.env.MONGODB_URL || process.env.MONGODB_URI;
  
  if (!mongoUrl) {
    logWarning('MongoDB URL not configured in environment variables');
    logWarning('Set MONGODB_URL in your .env file');
    return false;
  }
  
  try {
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 });
    logSuccess('MongoDB connection successful');
    await mongoose.disconnect();
    return true;
  } catch (err) {
    logError(`MongoDB connection failed: ${err.message}`);
    logWarning('Make sure MongoDB is running and the connection string is correct');
    return false;
  }
}

async function checkIPFS() {
  logInfo('Checking IPFS connection...');
  
  const ipfsEnabled = process.env.IPFS_ENABLED?.toLowerCase() === 'true';
  const ipfsUrl = process.env.IPFS_URL || 'http://localhost:5001';
  
  if (!ipfsEnabled) {
    logWarning('IPFS is disabled in configuration (IPFS_ENABLED=false)');
    logInfo('System will use mock storage for documents');
    return true;
  }
  
  try {
    const response = await fetch(`${ipfsUrl}/api/v0/version`, {
      method: 'POST',
      timeout: 5000
    });
    
    if (response.ok) {
      const version = await response.json();
      logSuccess(`IPFS connection successful (version: ${version.Version})`);
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    logError(`IPFS connection failed: ${err.message}`);
    logWarning('Start IPFS daemon with: ipfs daemon');
    logWarning('Or disable IPFS by setting IPFS_ENABLED=false in .env');
    return false;
  }
}

async function checkBlockchain() {
  logInfo('Checking blockchain connection...');
  
  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  const contractAddress = process.env.TOURIST_ID_CONTRACT_ADDRESS;
  
  if (!rpcUrl || !contractAddress) {
    logWarning('Blockchain not fully configured');
    logInfo('Set ETHEREUM_RPC_URL and TOURIST_ID_CONTRACT_ADDRESS in .env for blockchain features');
    return true; // Not an error, just optional
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    logSuccess(`Blockchain connection successful (network: ${network.name}, chainId: ${network.chainId})`);
    
    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    if (code && code !== '0x') {
      logSuccess('Smart contract found at configured address');
    } else {
      logWarning('Smart contract not found at configured address');
      logWarning('Deploy the contract or update TOURIST_ID_CONTRACT_ADDRESS');
    }
    
    return true;
  } catch (err) {
    logError(`Blockchain connection failed: ${err.message}`);
    logWarning('Start local blockchain with: npm run blockchain:node');
    logWarning('Or use a testnet/mainnet RPC URL');
    return false;
  }
}

async function checkEnvironmentVariables() {
  logInfo('Checking environment configuration...');
  
  const required = [
    'ENCRYPTION_KEY',
    'SESSION_SECRET'
  ];
  
  const optional = [
    'MONGODB_URL',
    'MONGODB_URI', 
    'ETHEREUM_RPC_URL',
    'TOURIST_ID_CONTRACT_ADDRESS',
    'ADMIN_PRIVATE_KEY',
    'IPFS_URL',
    'IPFS_ENABLED',
    'PORT',
    'NODE_ENV'
  ];
  
  let allRequired = true;
  
  for (const key of required) {
    if (!process.env[key]) {
      logError(`Missing required environment variable: ${key}`);
      allRequired = false;
    }
  }
  
  if (allRequired) {
    logSuccess('All required environment variables are set');
  }
  
  let optionalCount = 0;
  for (const key of optional) {
    if (process.env[key]) {
      optionalCount++;
    }
  }
  
  logInfo(`Optional configuration: ${optionalCount}/${optional.length} variables set`);
  
  return allRequired;
}

async function checkSystemHealth() {
  log(colors.bold + colors.blue, '🔍 Tourist Safety System Health Check');
  log(colors.bold + colors.blue, '=====================================');
  
  const results = {
    env: await checkEnvironmentVariables(),
    mongodb: await checkMongoDB(),
    ipfs: await checkIPFS(),
    blockchain: await checkBlockchain()
  };
  
  console.log('\\n' + colors.bold + 'Summary:' + colors.reset);
  console.log('--------');
  
  if (results.env) {
    logSuccess('Environment configuration ✓');
  } else {
    logError('Environment configuration ✗');
  }
  
  if (results.mongodb) {
    logSuccess('Database connection ✓');
  } else {
    logError('Database connection ✗');
  }
  
  if (results.ipfs) {
    logSuccess('Document storage ✓');
  } else {
    logWarning('Document storage (using fallback) ⚠');
  }
  
  if (results.blockchain) {
    logSuccess('Blockchain services ✓');
  } else {
    logWarning('Blockchain services (using fallback) ⚠');
  }
  
  const criticalIssues = !results.env || !results.mongodb;
  const minorIssues = !results.ipfs || !results.blockchain;
  
  console.log('\\n' + colors.bold + 'System Status:' + colors.reset);
  
  if (criticalIssues) {
    logError('System has critical issues that need to be resolved');
    process.exit(1);
  } else if (minorIssues) {
    logWarning('System is functional but some optional services are unavailable');
    logInfo('The application will use fallback implementations for missing services');
  } else {
    logSuccess('All systems operational! 🚀');
  }
  
  console.log('\\n' + colors.bold + 'Next Steps:' + colors.reset);
  console.log('- Start the application with: npm run dev');
  console.log('- Check service status at: http://localhost:5000/api/blockchain/status');
  console.log('- Read documentation: README.md and IPFS_SETUP.md');
}

// Run the health check
checkSystemHealth().catch(err => {
  console.error('Health check failed:', err);
  process.exit(1);
});