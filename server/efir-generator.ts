import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from './storage';

export interface EFIRData {
  touristId: string;
  incidentType: string; // Changed from specific union to string for flexibility
  location: string;
  locationLat?: number;
  locationLng?: number;
  description: string;
  evidenceFiles: string[];
  filedBy: string;
  authorityContacted: string;
}

export interface EFIRResult {
  firNumber: string;
  efirId: string;
  pdfPath: string;
  status: string;
}

export class EFIRGenerator {
  private static readonly FIR_PREFIX = 'EFIR';
  private static readonly PDF_DIR = 'uploads/efirs';

  /**
   * Generate automated E-FIR
   */
  public static async generateEFIR(efirData: EFIRData): Promise<EFIRResult> {
    try {
      // Generate unique FIR number
      const firNumber = this.generateFIRNumber();
      
      // Create E-FIR record in database
      const efir = await storage.createEFIR({
        ...efirData,
        firNumber,
        status: 'filed'
      });

      // Generate PDF document
      const pdfPath = await this.generatePDFDocument(efir, efirData);
      
      // Update E-FIR with PDF path
      await storage.updateEFIR(efir.id, { pdfPath });

      // Send notification to authorities
      await this.notifyAuthorities(efir, efirData);

      return {
        firNumber,
        efirId: efir.id,
        pdfPath,
        status: 'filed'
      };
    } catch (error) {
      console.error('Error generating E-FIR:', error);
      throw new Error('Failed to generate E-FIR');
    }
  }

  /**
   * Generate unique FIR number
   */
  private static generateFIRNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const time = String(date.getTime()).slice(-6);
    
    return `${this.FIR_PREFIX}${year}${month}${day}${time}`;
  }

  /**
   * Generate PDF document (simplified version)
   */
  private static async generatePDFDocument(efir: any, efirData: EFIRData): Promise<string> {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), this.PDF_DIR);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate PDF content (simplified HTML-like format for now)
    const pdfContent = this.generatePDFContent(efir, efirData);
    
    const fileName = `${efir.firNumber}.txt`; // Using .txt for now since PDF generation needs additional libraries
    const filePath = path.join(uploadDir, fileName);
    
    fs.writeFileSync(filePath, pdfContent);
    
    return filePath;
  }

  /**
   * Generate PDF content
   */
  private static generatePDFContent(efir: any, efirData: EFIRData): string {
    const currentDate = new Date().toLocaleDateString();
    
    return `
ELECTRONIC FIRST INFORMATION REPORT (E-FIR)
===========================================

FIR Number: ${efir.firNumber}
Date Filed: ${currentDate}
Status: ${efir.status}

INCIDENT DETAILS
================
Type: ${efirData.incidentType}
Location: ${efirData.location}
${efirData.locationLat ? `Coordinates: ${efirData.locationLat}, ${efirData.locationLng}` : ''}

DESCRIPTION
===========
${efirData.description}

COMPLAINANT DETAILS
==================
Tourist ID: ${efirData.touristId}
Filed By: ${efirData.filedBy}

AUTHORITY CONTACTED
==================
Authority ID: ${efirData.authorityContacted}

EVIDENCE FILES
==============
${efirData.evidenceFiles.length > 0 ? efirData.evidenceFiles.join('\n') : 'No evidence files attached'}

SYSTEM INFORMATION
==================
Generated automatically by Tourist Safety System
Timestamp: ${new Date().toISOString()}

---
This is an electronically generated document.
For queries, contact: support@touristsafety.gov
    `.trim();
  }

  /**
   * Send notification to authorities
   */
  private static async notifyAuthorities(efir: any, efirData: EFIRData): Promise<void> {
    try {
      // Get authority details
      const authority = await storage.getAuthorityById(efirData.authorityContacted);
      if (!authority) {
        throw new Error('Authority not found');
      }

      // In a real implementation, this would send email/SMS
      console.log(`📧 E-FIR Notification sent to ${authority.name} (${authority.email})`);
      console.log(`📱 SMS sent to ${authority.phone}`);
      
      // Create alert for immediate attention
      await storage.createAlert({
        type: 'emergency',
        severity: 'high',
        title: `New E-FIR Filed: ${efir.firNumber}`,
        message: `E-FIR filed for ${efirData.incidentType} incident at ${efirData.location}`,
        location: efirData.location,
        touristId: efirData.touristId
      });

    } catch (error) {
      console.error('Error notifying authorities:', error);
    }
  }

  /**
   * Update E-FIR status
   */
  public static async updateEFIRStatus(efirId: string, status: string, responderNotes?: string): Promise<void> {
    await storage.updateEFIR(efirId, { status });
  }
};