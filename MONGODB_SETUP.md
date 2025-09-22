# MongoDB Setup for Tourist Safety Monitoring System

## Overview
Your Tourist Safety Monitoring System has been migrated to use MongoDB for persistent data storage instead of in-memory storage.

## Setup Instructions

### Option 1: Local MongoDB Installation

1. **Install MongoDB Community Server**
   - Download from: https://www.mongodb.com/try/download/community
   - Follow installation instructions for Windows
   - MongoDB will typically run on `mongodb://localhost:27017`

2. **Start MongoDB Service**
   ```bash
   # Windows - MongoDB should start automatically as a service
   # Or manually start with:
   net start MongoDB
   ```

3. **Verify MongoDB is Running**
   ```bash
   # Connect to MongoDB shell
   mongosh
   # Should connect successfully to mongodb://127.0.0.1:27017
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create MongoDB Atlas Account**
   - Go to: https://www.mongodb.com/atlas
   - Create a free cluster

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like `mongodb+srv://...`)

3. **Update Environment Variables**
   - Replace `MONGODB_URI` in `.env` with your Atlas connection string

### Configuration

1. **Environment Variables**
   - Copy `.env.example` to `.env` if not already done
   - Update `MONGODB_URI` with your MongoDB connection string:
   ```
   # For local MongoDB
   MONGODB_URI=mongodb://localhost:27017/tourist_safety
   
   # For MongoDB Atlas
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tourist_safety
   ```

2. **Database Name**
   - The application will automatically create a database called `tourist_safety`
   - Collections (tables) will be created automatically: `users`, `tourists`, `alerts`, `emergencyincidents`

## Features

### ✅ What's Included

- **Persistent Data Storage**: All data is now saved to MongoDB
- **Automatic Schema Creation**: Collections are created automatically
- **Data Migration**: All existing functionality preserved
- **Fallback Support**: If MongoDB connection fails, falls back to in-memory storage
- **Admin User Setup**: Admin accounts are automatically created on first run
- **Blockchain Integration**: Blockchain features still work with MongoDB storage

### 📊 Data Structure

The system stores 4 main types of data:

1. **Users** - Admin and tourist accounts
2. **Tourists** - Tourist profiles with personal information
3. **Alerts** - Safety alerts and notifications
4. **Emergency Incidents** - Emergency situations and responses

### 🔧 Admin Accounts

The following admin accounts are automatically created:
- Email: `admin1@safetysystem.com` / Username: `admin1` / Password: `admin123`
- Email: `admin2@safetysystem.com` / Username: `admin2` / Password: `admin456`

### 🧪 Tourist Test Accounts

These demo tourist accounts are available for testing:
- Email: `tourist1@example.com` / Password: `tourist123`
- Email: `tourist2@example.com` / Password: `tourist456` 
- Email: `tourist3@example.com` / Password: `tourist789`

## Running the Application

1. **Start the Development Server**
   ```bash
   npm run dev
   ```

2. **Check Console Output**
   - Look for: `🍃 Initializing MongoDB storage...`
   - Success: `✅ Connected to MongoDB successfully`
   - Failure: `⚠️ MONGODB_URI not set, using in-memory storage`

3. **Access the Application**
   - Open: http://localhost:5000
   - Login with admin or tourist credentials

## Troubleshooting

### MongoDB Connection Issues

1. **Check MongoDB is Running**
   ```bash
   # Test connection
   mongosh "mongodb://localhost:27017/tourist_safety"
   ```

2. **Common Connection Strings**
   ```
   # Local MongoDB (default)
   mongodb://localhost:27017/tourist_safety
   
   # Local MongoDB with auth
   mongodb://username:password@localhost:27017/tourist_safety
   
   # MongoDB Atlas
   mongodb+srv://username:password@cluster.mongodb.net/tourist_safety
   ```

3. **Check Environment Variables**
   - Ensure `.env` file exists in project root
   - Verify `MONGODB_URI` is correctly set
   - Restart the development server after changes

### Data Persistence Test

1. **Create a tourist profile** using the registration form
2. **Restart the server** with `Ctrl+C` then `npm run dev`
3. **Check if data persists** - tourist should still exist

## Database Management

### Using MongoDB Compass (Recommended)

1. **Install MongoDB Compass**
   - Download from: https://www.mongodb.com/products/compass
   - Connect using your MongoDB URI

2. **View Data**
   - Database: `tourist_safety`
   - Collections: `users`, `tourists`, `alerts`, `emergencyincidents`

### Using MongoDB Shell

```bash
# Connect to database
mongosh "mongodb://localhost:27017/tourist_safety"

# List collections
show collections

# View users
db.users.find().pretty()

# View tourists  
db.tourists.find().pretty()

# Count documents
db.users.countDocuments()
```

## Migration Notes

- **No Data Loss**: Your existing in-memory data structure is preserved
- **Same API**: All existing routes and functionality work unchanged  
- **Performance**: MongoDB provides better performance for large datasets
- **Backup**: Data is automatically persisted and can be backed up
- **Scalability**: Ready for production deployment

## Next Steps

1. **Test the Application**: Verify all features work with MongoDB
2. **Backup Strategy**: Set up regular MongoDB backups for production
3. **Indexing**: Add database indexes for better query performance
4. **Monitoring**: Consider MongoDB monitoring tools for production use

## Support

If you encounter any issues:
1. Check the console output for error messages
2. Verify MongoDB connection string is correct
3. Ensure MongoDB service is running
4. Check firewall settings if using remote MongoDB