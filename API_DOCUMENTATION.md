# 🚀 Tourist Safety System - Complete API Documentation

## Overview

The Tourist Safety System provides a comprehensive REST API for managing tourist safety, emergency response, blockchain-secured digital IDs, and real-time monitoring. This document covers all available endpoints with detailed descriptions, request/response formats, and usage examples.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require user authentication. Include user information in request headers or body as specified.

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Tourist Management](#tourist-management)
3. [Emergency System](#emergency-system)
4. [Alerts & Notifications](#alerts--notifications)
5. [Blockchain Services](#blockchain-services)
6. [Geofencing & Location](#geofencing--location)
7. [File Management](#file-management)
8. [Analytics & Reporting](#analytics--reporting)
9. [AI & Anomaly Detection](#ai--anomaly-detection)
10. [E-FIR System](#e-fir-system)
11. [Authority Management](#authority-management)
12. [System Monitoring](#system-monitoring)
13. [Real-time Features](#real-time-features)

---

## 🔐 Authentication

### Google OAuth Login
```http
POST /auth/google
Content-Type: application/json

{
  "email": "user@gmail.com",
  "name": "User Name",
  "googleId": "google_user_id"
}
```

### Admin Login
```http
POST /auth/admin
Content-Type: application/json

{
  "username": "admin1",
  "password": "admin123"
}
```

### Tourist Sign In
```http
POST /auth/tourist/signin
Content-Type: application/json

{
  "email": "tourist@example.com",
  "password": "password"
}
```

### Tourist Registration
```http
POST /auth/tourist/register
Content-Type: application/json

{
  "email": "tourist@example.com",
  "name": "Tourist Name",
  "password": "password"
}
```

---

## 👥 Tourist Management

### Create Tourist Profile
```http
POST /tourists
Content-Type: application/json

{
  "userId": "user_id",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "documentType": "passport",
  "documentUrl": "https://storage.example.com/doc.pdf",
  "itinerary": "Delhi -> Mumbai -> Goa",
  "startDate": "2024-01-15",
  "endDate": "2024-01-25",
  "emergencyName": "Emergency Contact",
  "emergencyPhone": "+1234567891",
  "currentLocation": "New Delhi",
  "locationLat": "28.6129",
  "locationLng": "77.2295"
}
```

### Get All Active Tourists
```http
GET /tourists
```

### Get Tourist by User ID
```http
GET /tourists/user/{userId}
```

### Update Tourist Profile
```http
PATCH /tourists/{touristId}
Content-Type: application/json

{
  "currentLocation": "Mumbai",
  "locationLat": "19.0760",
  "locationLng": "72.8777",
  "safetyScore": 90
}
```

### Check Digital ID Validity
```http
POST /tourists/check-digital-id
Content-Type: application/json

{
  "userId": "user_id",
  "startDate": "2024-01-15",
  "endDate": "2024-01-25"
}
```

### Update Trip Dates
```http
PUT /tourists/{touristId}/trip-dates
Content-Type: application/json

{
  "startDate": "2024-01-15",
  "endDate": "2024-01-30",
  "itinerary": "Extended stay in Goa"
}
```

---

## 🚨 Emergency System

### Report Emergency Incident
```http
POST /emergencies
Content-Type: application/json

{
  "touristId": "tourist_id",
  "type": "panic_button",
  "location": "Marine Drive, Mumbai",
  "locationLat": "18.9220",
  "locationLng": "72.8347",
  "description": "Lost and need assistance"
}
```

### Get All Emergency Incidents
```http
GET /emergencies
```

### Update Emergency Incident
```http
PATCH /emergencies/{incidentId}
Content-Type: application/json

{
  "status": "investigating",
  "responderNotes": "Local police dispatched"
}
```

### Get Emergency Contacts
```http
GET /emergency-contacts/{touristId}
```

---

## 📢 Alerts & Notifications

### Get All Alerts
```http
GET /alerts
```

### Get Tourist Alerts
```http
GET /alerts/tourist/{touristId}
```

### Create Alert
```http
POST /alerts
Content-Type: application/json

{
  "touristId": "tourist_id",
  "type": "safety",
  "severity": "medium",
  "title": "Safety Advisory",
  "message": "Avoid crowded areas due to local festival",
  "location": "Connaught Place, Delhi"
}
```

### Send Notification
```http
POST /notifications/send
Content-Type: application/json

{
  "type": "safety",
  "severity": "medium",
  "title": "Safety Alert",
  "message": "Weather conditions changing",
  "recipient": {
    "id": "tourist_id",
    "email": "tourist@example.com",
    "phone": "+1234567890"
  },
  "channels": ["email", "sms", "push"]
}
```

### Send Emergency Notification
```http
POST /notifications/emergency/{touristId}
Content-Type: application/json

{
  "message": "Emergency assistance required",
  "location": "Current GPS coordinates"
}
```

### Update Notification Preferences
```http
PUT /notifications/preferences/{touristId}
Content-Type: application/json

{
  "emailNotifications": true,
  "smsNotifications": true,
  "pushNotifications": true,
  "emergencyAlerts": true,
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  }
}
```

---

## ⛓️ Blockchain Services

### Get Blockchain Service Status
```http
GET /blockchain/status
```

### Verify Tourist Identity
```http
POST /blockchain/verify-identity
Content-Type: application/json

{
  "touristId": "tourist_id",
  "message": "verification_message",
  "signature": "0x_signature"
}
```

### Verify Tourist Profile (Admin)
```http
POST /blockchain/verify-profile
Content-Type: application/json

{
  "touristId": "tourist_id",
  "verificationLevel": 1
}
```

### Get Blockchain Profile
```http
GET /blockchain/profile/{touristId}
```

### Emergency Access
```http
POST /blockchain/emergency-access
Content-Type: application/json

{
  "touristId": "tourist_id"
}
```

### Check Verification Status
```http
GET /blockchain/verification-status/{touristId}
```

### Get Network Information
```http
GET /blockchain/network-info
```

---

## 📍 Geofencing & Location

### Process Location Update
```http
POST /geofencing/location-update
Content-Type: application/json

{
  "touristId": "tourist_id",
  "latitude": 28.6129,
  "longitude": 77.2295,
  "accuracy": 10
}
```

### Real-time Location Update
```http
POST /location/update
Content-Type: application/json

{
  "touristId": "tourist_id",
  "lat": 28.6129,
  "lng": 77.2295,
  "accuracy": 10,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Check Geofence
```http
POST /geofence/check
Content-Type: application/json

{
  "touristId": "tourist_id",
  "lat": 28.6129,
  "lng": 77.2295
}
```

### Get Safe Zones
```http
GET /geofencing/safe-zones
```

### Create Safe Zone
```http
POST /geofencing/safe-zones
Content-Type: application/json

{
  "name": "Tourist Information Center",
  "description": "Official tourist help center",
  "center": {
    "latitude": 28.6129,
    "longitude": 77.2295
  },
  "radius": 500,
  "type": "tourist_area",
  "isActive": true,
  "metadata": {
    "contactInfo": "+91-11-1363",
    "operatingHours": "09:00-18:00"
  }
}
```

### Get Nearby Zones
```http
GET /geofencing/nearby-zones?lat=28.6129&lng=77.2295&radius=5
```

### Get Emergency Facilities
```http
GET /geofencing/emergency-facilities?lat=28.6129&lng=77.2295&radius=10
```

### Get Safety Recommendations
```http
GET /geofencing/safety-recommendations?lat=28.6129&lng=77.2295
```

---

## 📁 File Management

### Upload Document
```http
POST /files/upload
Content-Type: application/json

{
  "touristId": "tourist_id",
  "documentType": "passport",
  "base64Data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  "fileName": "passport.jpg",
  "description": "Passport photo page",
  "tags": ["identity", "travel_document"]
}
```

### Get File Metadata
```http
GET /files/{fileId}
```

### Get Tourist Files
```http
GET /files/tourist/{touristId}
```

### Verify Document
```http
POST /files/{fileId}/verify
Content-Type: application/json

{
  "verifiedBy": "admin_user_id"
}
```

### Search Files
```http
POST /files/search
Content-Type: application/json

{
  "touristId": "tourist_id",
  "documentType": "passport",
  "isVerified": true,
  "fromDate": "2024-01-01",
  "toDate": "2024-01-31"
}
```

### Bulk Verify Documents
```http
POST /files/bulk-verify
Content-Type: application/json

{
  "fileIds": ["file1", "file2", "file3"],
  "verifiedBy": "admin_user_id"
}
```

---

## 📊 Analytics & Reporting

### System Metrics
```http
GET /analytics/system-metrics
```

### Location Analytics
```http
GET /analytics/location
```

### Time-based Analytics
```http
GET /analytics/time-based
```

### Tourist Behavior Analytics
```http
GET /analytics/behavior
```

### Performance Analytics
```http
GET /analytics/performance
```

### Predictive Analytics
```http
GET /analytics/predictive
```

### Comprehensive Report
```http
GET /analytics/comprehensive-report
```

### Statistics Overview
```http
GET /statistics
```

### Real-time Dashboard Data
```http
GET /dashboard/realtime
```

---

## 🤖 AI & Anomaly Detection

### Get AI Anomalies
```http
GET /anomalies
```

### Get Tourist Anomalies
```http
GET /anomalies/tourist/{touristId}
```

### Detect Anomalies
```http
POST /anomalies/detect
Content-Type: application/json

{
  "touristId": "tourist_id"
}
```

### Update Anomaly
```http
PATCH /anomalies/{anomalyId}
Content-Type: application/json

{
  "isResolved": true
}
```

### Test Anomaly Detection
```http
POST /test/anomaly-detection
```

---

## 📋 E-FIR System

### Get E-FIRs
```http
GET /efirs
```

### Get Tourist E-FIRs
```http
GET /efirs/tourist/{touristId}
```

### Create E-FIR
```http
POST /efirs
Content-Type: application/json

{
  "touristId": "tourist_id",
  "incidentType": "theft",
  "location": "Connaught Place, Delhi",
  "locationLat": "28.6304",
  "locationLng": "77.2177",
  "description": "Mobile phone stolen from restaurant",
  "evidenceFiles": ["evidence1.jpg", "evidence2.pdf"],
  "filedBy": "user_id",
  "authorityContacted": "authority_id"
}
```

### Update E-FIR
```http
PATCH /efirs/{efirId}
Content-Type: application/json

{
  "status": "investigating"
}
```

---

## 👮 Authority Management

### Get Authorities
```http
GET /authorities
```

### Create Authority
```http
POST /authorities
Content-Type: application/json

{
  "name": "Delhi Tourism Police",
  "type": "tourist_police",
  "email": "tourism.police@delhi.gov.in",
  "phone": "+91-11-1363",
  "jurisdiction": "Delhi"
}
```

### Update Authority
```http
PATCH /authorities/{authorityId}
Content-Type: application/json

{
  "phone": "+91-11-1364",
  "isActive": true
}
```

---

## 🔧 System Monitoring

### System Health Check
```http
GET /system/health
```

### File Upload (Legacy)
```http
POST /upload
```

### Weather Information
```http
GET /weather/{location}
```

### Safety Recommendations
```http
GET /safety/recommendations/{touristId}
```

---

## 🔄 Real-time Features

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:5000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

### WebSocket Event Types
- `NEW_TOURIST` - New tourist registration
- `LOCATION_UPDATE` - Tourist location update
- `NEW_ALERT` - New alert created
- `EMERGENCY_INCIDENT` - Emergency incident reported
- `GEOFENCE_ALERT` - Geofencing violation
- `DOCUMENT_VERIFIED` - Document verification complete
- `AI_ANOMALY_DETECTED` - AI anomaly detected
- `NEW_EFIR` - New E-FIR filed

---

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Detailed error information",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🔒 Security Considerations

1. **Authentication**: All sensitive endpoints require proper authentication
2. **Authorization**: Role-based access control (Tourist, Admin, Authority)
3. **Data Encryption**: Sensitive data encrypted at rest and in transit
4. **Blockchain Security**: Digital IDs secured with blockchain technology
5. **Rate Limiting**: API rate limiting to prevent abuse
6. **Input Validation**: All inputs validated and sanitized
7. **Audit Trail**: Complete audit trail for all operations

---

## 📈 Rate Limits

- **General API calls**: 1000 requests per hour per user
- **File uploads**: 50 uploads per hour per user
- **Emergency endpoints**: No rate limiting
- **Real-time updates**: 100 updates per minute per tourist

---

## 🚀 Getting Started

1. **Start the server**: `npm run dev`
2. **Health check**: `GET /api/system/health`
3. **Create user**: `POST /api/auth/tourist/register`
4. **Create tourist profile**: `POST /api/tourists`
5. **Start location tracking**: `POST /api/location/update`

---

## 📞 Support

For API support and documentation updates:
- Check system health: `/api/system/health`
- Monitor real-time status via WebSocket
- Review comprehensive analytics: `/api/analytics/comprehensive-report`

---

**Note**: This API provides comprehensive tourist safety features including blockchain-secured digital IDs, real-time monitoring, emergency response, AI-powered anomaly detection, and advanced analytics. All endpoints are production-ready with proper error handling, validation, and security measures.