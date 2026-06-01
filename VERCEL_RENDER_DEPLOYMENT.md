# SpikeBulls Production Deployment Guide

## 📋 Deployment Stack Options
### Option 1: Full Vercel Deployment
- **Database**: MongoDB Atlas (Free M0 Cluster)
- **Backend**: Vercel (Serverless Functions)
- **Frontend**: Vercel (Free Tier)

### Option 2: Vercel + Render (Recommended)
- **Database**: MongoDB Atlas (Free M0 Cluster)
- **Backend**: Render (Free Tier, persistent storage)
- **Frontend**: Vercel (Free Tier)

---

## ✅ Deployment Checklist

### Phase 1: MongoDB Atlas Setup (Both Options)
- [ ] Create MongoDB Atlas account
- [ ] Launch M0 Sandbox Cluster (free)
- [ ] Create database user
- [ ] Configure network access (0.0.0.0/0 for testing)
- [ ] Get connection string
- [ ] Test connection locally

### Phase 2a: Backend Deployment (Vercel Serverless)
- [ ] Sign up for Vercel account
- [ ] Connect GitHub repo
- [ ] Create new Project for backend:
  - Root directory: `backend`
  - Framework: Other
- [ ] Add all environment variables (see `backend/.env.production.example`)
- [ ] Deploy backend
- [ ] Verify backend health at `/api/health`
- ⚠️ Note: No persistent local storage on Vercel - use cloud storage (S3/Cloudinary) for files!

### Phase 2b: Backend Deployment (Render)
- [ ] Sign up for Render account
- [ ] Connect GitHub repo
- [ ] Create new Web Service
- [ ] Configure service settings:
  - Root directory: `backend`
  - Runtime: Python 3
  - Build command: `pip install -r requirements.txt`
  - Start command: `uvicorn server:app --host 0.0.0.0 --port 8000`
- [ ] Add all environment variables (see `backend/.env.production.example`)
- [ ] Deploy backend
- [ ] Verify backend health at `/api/health`

### Phase 3: Frontend Deployment (Vercel)
- [ ] Sign up for Vercel account (if not already done)
- [ ] Connect GitHub repo (if not already done)
- [ ] Create new Project for frontend:
  - Root directory: `frontend`
  - Framework: Create React App
- [ ] Add environment variable: `REACT_APP_BACKEND_URL`
- [ ] Deploy frontend
- [ ] Verify frontend loads correctly

### Phase 4: Integration & Testing
- [ ] Update `APP_URL` and `CORS_ORIGINS` in backend with Vercel URL
- [ ] Update `REACT_APP_BACKEND_URL` in Vercel with your backend URL
- [ ] Test user registration/login
- [ ] Test admin login
- [ ] Test contact form
- [ ] Test product pages
- [ ] Verify manual Binance payment workflow
- [ ] Test admin dashboard functionality

---

## Step-by-Step Instructions

### 1. MongoDB Atlas Setup
1. Go to [mongodb.com](https://www.mongodb.com) and sign up
2. Create a **M0 Sandbox Cluster** (free forever)
3. Choose cloud provider and region
4. Create database user (save credentials!)
5. Add `0.0.0.0/0` to Network Access
6. Copy connection string (replace `<username>` and `<password>`)

### 2a. Backend Deployment on Vercel
1. Go to [vercel.com](https://vercel.com), sign up with GitHub
2. Click **Add New…** → **Project**
3. Import your repository
4. Configure:
   - Name: `spikebulls-backend`
   - Root Directory: `backend`
   - Framework Preset: Other
5. Add Environment Variables (copy from `backend/.env.production.example`)
6. Click **Deploy**

### 2b. Backend Deployment on Render
1. Go to [render.com](https://render.com), sign up with GitHub
2. Click **New +** → **Web Service**
3. Connect your repository
4. Configure:
   - Name: `spikebulls-backend`
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port 8000`
   - Instance Type: Free
5. Add Environment Variables (copy from `backend/.env.production.example`)
6. Click **Create Web Service**

### 3. Frontend Deployment on Vercel
1. Go to [vercel.com](https://vercel.com), sign up with GitHub (if needed)
2. Click **Add New…** → **Project**
3. Import your repository
4. Configure:
   - Name: `spikebulls-frontend`
   - Root Directory: `frontend`
   - Framework Preset: Create React App
5. Add Environment Variable:
   - `REACT_APP_BACKEND_URL`: Your backend URL (e.g., `https://spikebulls-backend.vercel.app` or Render URL)
6. Click **Deploy**

---

## Environment Variables

### Backend (Vercel or Render)
Use `backend/.env.production.example` as template:
- `MONGO_URL`: MongoDB Atlas connection string
- `MONGO_TLS`: true (for MongoDB Atlas)
- `DB_NAME`: spikebulls
- `APP_URL`: Your Vercel frontend URL
- `CORS_ORIGINS`: Your Vercel frontend URL
- `JWT_SECRET`: Strong random secret
- `ADMIN_EMAIL`: admin@spikebulls.com
- `ADMIN_PASSWORD`: Strong admin password
- `EMAIL_PROVIDER`: resend
- `EMAIL_FROM`: SpikeBulls <spikebulls108@gmail.com>
- `RESEND_API_KEY`: Your Resend API key

### Frontend (Vercel)
Use `frontend/.env.example` as template:
- `REACT_APP_BACKEND_URL`: Your backend URL (Vercel or Render)

---

## 📝 Manual Binance Payment Workflow
1. User fills payment details
2. User receives Binance QR code/payment instructions
3. User makes payment manually
4. User uploads payment proof
5. System creates "pending" order
6. From Admin Dashboard:
    - View pending orders
    - Mark order as ACTIVE
    - Licenses are generated automatically
    - Users receive welcome email with license keys
    - Users can download files from their dashboard

---

## 🔒 Security Best Practices
- Never commit secrets to Git
- Use environment variables for all sensitive data
- Enable 2FA on all accounts
- Use HTTPS everywhere
- Rotate secrets regularly
- Restrict IP access when possible
- Keep dependencies updated

---

## 🎉 You're Done!
Your SpikeBulls platform is now production-ready!

## Files Created/Updated
- `backend/.env.production.example`: Backend environment variables template
- `backend/vercel.json`: Vercel configuration for backend
- `backend/api/index.py`: Vercel serverless function entry point
- `frontend/vercel.json`: Vercel configuration
- `frontend/.env.example`: Frontend environment variables template
- `VERCEL_RENDER_DEPLOYMENT.md`: This guide

