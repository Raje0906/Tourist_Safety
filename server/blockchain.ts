import { ethers } from 'ethers';
import { create as ipfsHttpClient } from 'ipfs-http-client';
import CryptoJS from 'crypto-js';

// Smart contract ABI (simplified - in production, import from compiled artifacts)
const TOURIST_ID_ABI = [
  "function createTouristProfile(bytes32 _profileHash, bytes32 _documentHash, string _ipfsDocumentHash, string _emergencyContact) external returns (bytes32)",
  "function verifyProfile(bytes32 _profileId, uint8 _verificationLevel) external",
  "function getProfile(bytes32 _profileId) external view returns (bytes32, bytes32, string, address, uint256, uint8, bool)",
  "function verifyProfileSignature(bytes32 _profileId, bytes32 _message, bytes _signature) external view returns (bool)",
  "function isProfileVerified(bytes32 _profileId) external view returns (bool)",
  "function getVerificationLevel(bytes32 _profileId) external view returns (uint8)",
  "function emergencyAccess(bytes32 _profileId) external returns (string)",
  "event ProfileCreated(bytes32 indexed profileId, address indexed touristAddress, bytes32 profileHash, uint256 timestamp)"
];

export interface BlockchainTouristProfile {
  profileId: string;
  profileHash: string;
  documentHash: string;
  ipfsDocumentHash: string;
  touristAddress: string;
  createdAt: number;
  verificationLevel: number;
  isActive: boolean;
  transactionHash: string;
}

export interface EncryptedDocument {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export class BlockchainTouristService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private ipfs: any;
  private contractAddress: string;

  constructor(
    rpcUrl: string = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545',
    contractAddress: string = process.env.TOURIST_ID_CONTRACT_ADDRESS || '',
    ipfsUrl: string = process.env.IPFS_URL || 'http://localhost:5001'
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contractAddress = contractAddress;
    
    // Initialize IPFS client
    this.ipfs = ipfsHttpClient({
      url: ipfsUrl,
      timeout: 30000
    });

    // Initialize contract (will be set when signer is available)
    this.contract = new ethers.Contract(contractAddress, TOURIST_ID_ABI, this.provider);
  }

  /**
   * Initialize with a wallet for transactions
   */
  async initializeWithWallet(privateKey: string): Promise<void> {
    const wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(this.contractAddress, TOURIST_ID_ABI, wallet);
  }

  /**
   * Hash tourist profile data
   */
  private hashProfile(profileData: any): string {
    const dataString = JSON.stringify({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      phone: profileData.phone,
      email: profileData.email,
      documentType: profileData.documentType,
      timestamp: Date.now()
    });
    return ethers.keccak256(ethers.toUtf8Bytes(dataString));
  }

  /**
   * Hash document data
   */
  private hashDocument(documentData: Buffer): string {
    return ethers.keccak256(documentData);
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  private encryptData(data: string, key: string): EncryptedDocument {
    const encrypted = CryptoJS.AES.encrypt(data, key).toString();
    const iv = CryptoJS.lib.WordArray.random(12).toString();
    const authTag = CryptoJS.lib.WordArray.random(16).toString();
    
    return {
      encryptedData: encrypted,
      iv,
      authTag
    };
  }

  /**
   * Decrypt sensitive data
   */
  private decryptData(encryptedDoc: EncryptedDocument, key: string): string {
    return CryptoJS.AES.decrypt(encryptedDoc.encryptedData, key).toString(CryptoJS.enc.Utf8);
  }

  /**
   * Upload encrypted document to IPFS
   */
  private async uploadToIPFS(data: any): Promise<string> {
    try {
      const result = await this.ipfs.add(JSON.stringify(data));
      return result.cid.toString();
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw new Error('Failed to upload document to IPFS');
    }
  }

  /**
   * Retrieve data from IPFS
   */
  private async retrieveFromIPFS(cid: string): Promise<any> {
    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks).toString();
      return JSON.parse(data);
    } catch (error) {
      console.error('IPFS retrieval failed:', error);
      throw new Error('Failed to retrieve document from IPFS');
    }
  }

  /**
   * Create a blockchain-secured tourist digital ID
   */
  async createDigitalTouristID(
    profileData: any,
    documentBuffer: Buffer,
    emergencyContact: string,
    encryptionKey: string
  ): Promise<BlockchainTouristProfile> {
    try {
      // 1. Hash profile and document data
      const profileHash = this.hashProfile(profileData);
      const documentHash = this.hashDocument(documentBuffer);

      // 2. Encrypt sensitive documents and emergency contact
      const encryptedDocument = this.encryptData(documentBuffer.toString('base64'), encryptionKey);
      const encryptedEmergencyContact = this.encryptData(emergencyContact, encryptionKey);

      // 3. Upload encrypted document to IPFS
      const ipfsHash = await this.uploadToIPFS({
        document: encryptedDocument,
        documentType: profileData.documentType,
        uploadTimestamp: Date.now()
      });

      // 4. Create profile on blockchain
      const tx = await this.contract.createTouristProfile(
        profileHash,
        documentHash,
        ipfsHash,
        JSON.stringify(encryptedEmergencyContact)
      );

      // 5. Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // 6. Extract profile ID from event logs
      const profileCreatedEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id("ProfileCreated(bytes32,address,bytes32,uint256)")
      );
      
      const profileId = profileCreatedEvent?.topics[1] || '';

      // 7. Return blockchain tourist profile
      return {
        profileId,
        profileHash,
        documentHash,
        ipfsDocumentHash: ipfsHash,
        touristAddress: await this.contract.runner?.getAddress() || '',
        createdAt: Math.floor(Date.now() / 1000),
        verificationLevel: 0,
        isActive: true,
        transactionHash: tx.hash
      };

    } catch (error) {
      console.error('Blockchain tourist ID creation failed:', error);
      throw new Error('Failed to create blockchain tourist ID');
    }
  }

  /**
   * Verify a tourist profile on blockchain
   */
  async verifyProfile(profileId: string, verificationLevel: number): Promise<string> {
    try {
      const tx = await this.contract.verifyProfile(profileId, verificationLevel);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Profile verification failed:', error);
      throw new Error('Failed to verify profile on blockchain');
    }
  }

  /**
   * Get tourist profile from blockchain
   */
  async getProfile(profileId: string): Promise<BlockchainTouristProfile | null> {
    try {
      const result = await this.contract.getProfile(profileId);
      
      return {
        profileId,
        profileHash: result[0],
        documentHash: result[1],
        ipfsDocumentHash: result[2],
        touristAddress: result[3],
        createdAt: Number(result[4]),
        verificationLevel: result[5],
        isActive: result[6],
        transactionHash: '' // Not available from view function
      };
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  /**
   * Verify digital signature for authentication
   */
  async verifyDigitalSignature(
    profileId: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
      return await this.contract.verifyProfileSignature(profileId, messageHash, signature);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Check if profile is verified
   */
  async isProfileVerified(profileId: string): Promise<boolean> {
    try {
      return await this.contract.isProfileVerified(profileId);
    } catch (error) {
      console.error('Verification check failed:', error);
      return false;
    }
  }

  /**
   * Get verification level
   */
  async getVerificationLevel(profileId: string): Promise<number> {
    try {
      return await this.contract.getVerificationLevel(profileId);
    } catch (error) {
      console.error('Failed to get verification level:', error);
      return 0;
    }
  }

  /**
   * Emergency access to profile data
   */
  async emergencyAccess(
    profileId: string,
    decryptionKey: string
  ): Promise<string | null> {
    try {
      const encryptedContact = await this.contract.emergencyAccess(profileId);
      const encryptedData = JSON.parse(encryptedContact);
      return this.decryptData(encryptedData, decryptionKey);
    } catch (error) {
      console.error('Emergency access failed:', error);
      return null;
    }
  }

  /**
   * Retrieve and decrypt documents from IPFS
   */
  async getDocuments(
    ipfsHash: string,
    decryptionKey: string
  ): Promise<string | null> {
    try {
      const encryptedData = await this.retrieveFromIPFS(ipfsHash);
      return this.decryptData(encryptedData.document, decryptionKey);
    } catch (error) {
      console.error('Document retrieval failed:', error);
      return null;
    }
  }

  /**
   * Generate wallet for tourist
   */
  static generateWallet(): { address: string; privateKey: string; mnemonic: string } {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || ''
    };
  }

  /**
   * Sign message with private key
   */
  static async signMessage(message: string, privateKey: string): Promise<string> {
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(message);
  }

  /**
   * Validate Ethereum address
   */
  static isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<{ name: string; chainId: number }> {
    const network = await this.provider.getNetwork();
    return {
      name: network.name,
      chainId: Number(network.chainId)
    };
  }

}