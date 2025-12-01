# Setup Guide - Alternative Learning System

## Prerequisites

### 1. Install Node.js
- Download Node.js from: https://nodejs.org/
- Install the LTS (Long Term Support) version (v18 or later)
- During installation, make sure to check "Add to PATH"
- Verify installation by opening a new terminal and running:
  ```powershell
  node --version
  npm --version
  ```

### 2. MongoDB Setup
This project requires a MongoDB database. You have two options:

**Option A: MongoDB Atlas (Cloud - Recommended for beginners)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (free tier available)
4. Get your connection string (MONGODB_URI)

**Option B: Local MongoDB**
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Install and start MongoDB service
3. Your connection string will be: `mongodb://localhost:27017`

## Installation Steps

### 1. Install Dependencies
Open PowerShell in the project directory and run:
```powershell
npm install
```

### 2. Create Environment File
Create a file named `.env.local` in the root directory with:
```
MONGODB_URI=your_mongodb_connection_string_here
```

**Example for MongoDB Atlas:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Example for Local MongoDB:**
```
MONGODB_URI=mongodb://localhost:27017/alternative-learning-system
```

### 3. Run the Development Server
```powershell
npm run dev
```

The application will start on **http://localhost:3001** (note: port 3001, not 3000)

## Troubleshooting

### If you get "MONGODB_URI environment variable is not set!"
- Make sure you created `.env.local` file in the root directory
- Restart the development server after creating/modifying `.env.local`

### If port 3001 is already in use
- The dev server uses port 3001 by default
- You can change it in `package.json` or stop the process using that port

### If you get "running scripts is disabled on this system" error
This is a PowerShell execution policy issue. Fix it by running one of these commands:

**Option 1: Set policy for current session (recommended)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
```

**Option 2: Set policy for current user (persistent)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

**Option 3: Use Command Prompt instead**
- Open Command Prompt (cmd.exe) instead of PowerShell
- Run `npm install` from there

### If npm install fails
- Make sure Node.js is properly installed
- Try deleting `node_modules` folder and `package-lock.json`, then run `npm install` again
- If npm is not recognized, restart your terminal after installing Node.js

## Available Scripts

- `npm run dev` - Start development server (port 3001)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

1. Open your browser and go to http://localhost:3001
2. The application should load and you can start using it!

