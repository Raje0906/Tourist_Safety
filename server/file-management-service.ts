/**
 * Comprehensive File Management Service
 * Handles document uploads, storage, validation, and retrieval
 */

import { randomUUID } from 'crypto';

export interface FileMetadata {
  id: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  extension: string;
  uploadedBy: string;
  uploadedAt: Date;
  documentType: 'passport' | 'visa' | 'aadhaar' | 'driving_license' | 'medical_certificate' | 'travel_insurance' | 'other';
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  tags: string[];
  description?: string;
  url: string;
  thumbnailUrl?: string;
  checksum: string;
  storageProvider: 'local' | 'aws_s3' | 'google_cloud' | 'azure' | 'ipfs';
  encryptionStatus: 'none' | 'encrypted' | 'blockchain_secured';
}

export interface UploadRequest {
  touristId: string;
  documentType: FileMetadata['documentType'];
  base64Data: string;
  fileName: string;
  description?: string;
  tags?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  extractedData?: {
    documentNumber?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    holderName?: string;
  };
}

export class FileManagementService {
  private files: Map<string, FileMetadata> = new Map();
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'image/tiff'
  ];
  private readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.tiff', '.tif'];

  constructor() {
    console.log('📁 File Management Service initialized');
  }

  /**
   * Upload and process a document
   */
  async uploadDocument(request: UploadRequest): Promise<{
    success: boolean;
    fileId?: string;
    metadata?: FileMetadata;
    validation?: ValidationResult;
    error?: string;
  }> {
    try {
      // Validate request
      const validation = this.validateUploadRequest(request);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Process base64 data
      const fileData = this.processBase64Data(request.base64Data);
      if (!fileData) {
        return { success: false, error: 'Invalid file data' };
      }

      // Generate file metadata
      const fileId = randomUUID();
      const extension = this.getFileExtension(request.fileName);
      const fileName = `${request.touristId}_${request.documentType}_${Date.now()}${extension}`;
      const checksum = this.calculateChecksum(fileData.buffer);

      // Simulate file storage (in production, upload to cloud storage)
      const storageResult = await this.storeFile(fileData.buffer, fileName);
      if (!storageResult.success) {
        return { success: false, error: 'File storage failed' };
      }

      // Create metadata
      const metadata: FileMetadata = {
        id: fileId,
        originalName: request.fileName,
        fileName,
        fileSize: fileData.size,
        mimeType: fileData.mimeType,
        extension,
        uploadedBy: request.touristId,
        uploadedAt: new Date(),
        documentType: request.documentType,
        isVerified: false,
        tags: request.tags || [],
        description: request.description,
        url: storageResult.url,
        thumbnailUrl: storageResult.thumbnailUrl,
        checksum,
        storageProvider: 'local',
        encryptionStatus: 'none'
      };

      // Store metadata
      this.files.set(fileId, metadata);

      // Validate document content
      const documentValidation = await this.validateDocument(fileData.buffer, request.documentType);

      console.log(`✅ Document uploaded successfully: ${fileName}`);
      
      return {
        success: true,
        fileId,
        metadata,
        validation: documentValidation
      };
    } catch (error) {
      console.error('Document upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Get file metadata
   */
  getFileMetadata(fileId: string): FileMetadata | null {
    return this.files.get(fileId) || null;
  }

  /**
   * Get files by tourist ID
   */
  getFilesByTourist(touristId: string): FileMetadata[] {
    return Array.from(this.files.values())
      .filter(file => file.uploadedBy === touristId)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  /**
   * Get files by document type
   */
  getFilesByType(documentType: FileMetadata['documentType']): FileMetadata[] {
    return Array.from(this.files.values())
      .filter(file => file.documentType === documentType)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  /**
   * Verify a document
   */
  async verifyDocument(fileId: string, verifiedBy: string): Promise<{
    success: boolean;
    metadata?: FileMetadata;
    error?: string;
  }> {
    try {
      const metadata = this.files.get(fileId);
      if (!metadata) {
        return { success: false, error: 'File not found' };
      }

      metadata.isVerified = true;
      metadata.verifiedBy = verifiedBy;
      metadata.verifiedAt = new Date();

      this.files.set(fileId, metadata);

      console.log(`✅ Document verified: ${metadata.fileName}`);
      
      return { success: true, metadata };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string, deletedBy: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const metadata = this.files.get(fileId);
      if (!metadata) {
        return { success: false, error: 'File not found' };
      }

      // Check permissions (in production, implement proper authorization)
      if (metadata.uploadedBy !== deletedBy) {
        return { success: false, error: 'Unauthorized to delete this file' };
      }

      // Delete from storage (simulate)
      await this.removeFromStorage(metadata.fileName);

      // Remove metadata
      this.files.delete(fileId);

      console.log(`🗑️ File deleted: ${metadata.fileName}`);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed'
      };
    }
  }

  /**
   * Search files
   */
  searchFiles(query: {
    touristId?: string;
    documentType?: FileMetadata['documentType'];
    isVerified?: boolean;
    tags?: string[];
    fromDate?: Date;
    toDate?: Date;
  }): FileMetadata[] {
    let results = Array.from(this.files.values());

    if (query.touristId) {
      results = results.filter(file => file.uploadedBy === query.touristId);
    }

    if (query.documentType) {
      results = results.filter(file => file.documentType === query.documentType);
    }

    if (query.isVerified !== undefined) {
      results = results.filter(file => file.isVerified === query.isVerified);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(file => 
        query.tags!.some(tag => file.tags.includes(tag))
      );
    }

    if (query.fromDate) {
      results = results.filter(file => file.uploadedAt >= query.fromDate!);
    }

    if (query.toDate) {
      results = results.filter(file => file.uploadedAt <= query.toDate!);
    }

    return results.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  /**
   * Generate file analytics
   */
  getFileAnalytics(): {
    totalFiles: number;
    verifiedFiles: number;
    filesByType: { [key: string]: number };
    filesByStorageProvider: { [key: string]: number };
    totalStorageUsed: number;
    averageFileSize: number;
    uploadTrends: { [key: string]: number };
  } {
    const files = Array.from(this.files.values());
    
    const filesByType: { [key: string]: number } = {};
    const filesByStorageProvider: { [key: string]: number } = {};
    const uploadTrends: { [key: string]: number } = {};
    
    let totalStorageUsed = 0;
    
    files.forEach(file => {
      // Count by type
      filesByType[file.documentType] = (filesByType[file.documentType] || 0) + 1;
      
      // Count by storage provider
      filesByStorageProvider[file.storageProvider] = (filesByStorageProvider[file.storageProvider] || 0) + 1;
      
      // Calculate storage usage
      totalStorageUsed += file.fileSize;
      
      // Upload trends by month
      const monthKey = file.uploadedAt.toISOString().substring(0, 7); // YYYY-MM
      uploadTrends[monthKey] = (uploadTrends[monthKey] || 0) + 1;
    });
    
    return {
      totalFiles: files.length,
      verifiedFiles: files.filter(f => f.isVerified).length,
      filesByType,
      filesByStorageProvider,
      totalStorageUsed,
      averageFileSize: files.length > 0 ? totalStorageUsed / files.length : 0,
      uploadTrends
    };
  }

  /**
   * Bulk operations
   */
  async bulkVerifyFiles(fileIds: string[], verifiedBy: string): Promise<{
    success: number;
    failed: number;
    results: Array<{ fileId: string; success: boolean; error?: string }>;
  }> {
    const results = [];
    let success = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      const result = await this.verifyDocument(fileId, verifiedBy);
      results.push({ fileId, ...result });
      
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed, results };
  }

  // Private helper methods

  private validateUploadRequest(request: UploadRequest): {
    isValid: boolean;
    error?: string;
  } {
    if (!request.touristId) {
      return { isValid: false, error: 'Tourist ID is required' };
    }

    if (!request.documentType) {
      return { isValid: false, error: 'Document type is required' };
    }

    if (!request.base64Data) {
      return { isValid: false, error: 'File data is required' };
    }

    if (!request.fileName) {
      return { isValid: false, error: 'File name is required' };
    }

    const extension = this.getFileExtension(request.fileName);
    if (!this.ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
      return { 
        isValid: false, 
        error: `File type not allowed. Supported: ${this.ALLOWED_EXTENSIONS.join(', ')}` 
      };
    }

    return { isValid: true };
  }

  private processBase64Data(base64Data: string): {
    buffer: Buffer;
    size: number;
    mimeType: string;
  } | null {
    try {
      // Extract MIME type and data from base64 string
      const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,(.+)$/);
      
      let mimeType = 'application/octet-stream';
      let data = base64Data;
      
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        data = matches[2];
      } else {
        // Assume plain base64 without data URL prefix
        data = base64Data;
      }

      if (!this.ALLOWED_TYPES.includes(mimeType)) {
        return null;
      }

      const buffer = Buffer.from(data, 'base64');
      
      if (buffer.length > this.MAX_FILE_SIZE) {
        return null;
      }

      return {
        buffer,
        size: buffer.length,
        mimeType
      };
    } catch (error) {
      console.error('Error processing base64 data:', error);
      return null;
    }
  }

  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot !== -1 ? fileName.substring(lastDot) : '';
  }

  private calculateChecksum(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async storeFile(buffer: Buffer, fileName: string): Promise<{
    success: boolean;
    url: string;
    thumbnailUrl?: string;
    error?: string;
  }> {
    try {
      // Mock file storage - in production, upload to cloud storage
      const baseUrl = 'https://storage.safetysystem.com/documents';
      const url = `${baseUrl}/${fileName}`;
      const thumbnailUrl = `${baseUrl}/thumbnails/thumb_${fileName}`;

      // Simulate storage delay
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`📁 File stored: ${fileName} (${buffer.length} bytes)`);
      
      return {
        success: true,
        url,
        thumbnailUrl
      };
    } catch (error) {
      return {
        success: false,
        url: '',
        error: error instanceof Error ? error.message : 'Storage failed'
      };
    }
  }

  private async removeFromStorage(fileName: string): Promise<void> {
    // Mock file deletion - in production, delete from cloud storage
    console.log(`🗑️ File removed from storage: ${fileName}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async validateDocument(buffer: Buffer, documentType: FileMetadata['documentType']): Promise<ValidationResult> {
    try {
      // Mock document validation - in production, use OCR and ML models
      const validation: ValidationResult = {
        isValid: true,
        confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
        issues: [],
        extractedData: {}
      };

      // Simulate document-specific validation
      switch (documentType) {
        case 'passport':
          validation.extractedData = {
            documentNumber: `P${Math.random().toString().substring(2, 10)}`,
            expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            issuingAuthority: 'Government of India',
            holderName: 'Sample Name'
          };
          break;
        case 'aadhaar':
          validation.extractedData = {
            documentNumber: Math.random().toString().substring(2, 14),
            issuingAuthority: 'UIDAI',
            holderName: 'Sample Name'
          };
          break;
        default:
          validation.extractedData = {
            documentNumber: `DOC${Math.random().toString().substring(2, 10)}`
          };
      }

      // Add random issues for demonstration
      if (Math.random() < 0.2) {
        validation.issues.push('Image quality could be better');
      }
      if (Math.random() < 0.1) {
        validation.issues.push('Some text is partially obscured');
      }

      return validation;
    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        issues: ['Document validation failed']
      };
    }
  }

  /**
   * Get file storage statistics
   */
  getStorageStatistics(): {
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    sizeByType: { [key: string]: number };
    storageHealth: 'good' | 'warning' | 'critical';
  } {
    const files = Array.from(this.files.values());
    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
    const averageSize = files.length > 0 ? totalSize / files.length : 0;
    
    const sizeByType: { [key: string]: number } = {};
    files.forEach(file => {
      sizeByType[file.documentType] = (sizeByType[file.documentType] || 0) + file.fileSize;
    });
    
    const storageHealth = totalSize > 1000000000 ? 'critical' : // 1GB
                         totalSize > 500000000 ? 'warning' :    // 500MB
                         'good';
    
    return {
      totalFiles: files.length,
      totalSize,
      averageSize,
      sizeByType,
      storageHealth
    };
  }
}

// Export singleton instance
export const fileManagementService = new FileManagementService();