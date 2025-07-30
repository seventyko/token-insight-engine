# External API Deployment Guide

You've successfully switched to Option 2 - External Backend for maximum quality research reports! 

## 🚀 Benefits Unlocked

- **No timeout limitations** (10+ minute processing)
- **Full web search depth** (advanced mode)
- **8 results per search query** (maximum quality)
- **Complete 4000+ word reports**
- **All speculative analysis sections included**

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Configure Function Timeout:**
   - Go to your Vercel dashboard
   - Navigate to Settings > Functions
   - Set timeout to 10 minutes (600 seconds)

4. **Get Your API URL:**
   - After deployment, copy the URL (e.g., `https://your-app.vercel.app`)
   - Your API endpoint will be: `https://your-app.vercel.app/api/deep-research`

### Option 2: Railway

1. **Connect GitHub repo to Railway:**
   - Go to [Railway](https://railway.app)
   - Create new project from GitHub repo

2. **Configure Environment:**
   - Railway will auto-deploy using `railway.toml`
   - No additional configuration needed

3. **Get Your API URL:**
   - Copy the generated Railway URL
   - Your API endpoint will be: `https://your-app.railway.app/api/deep-research`

### Option 3: Render

1. **Create Web Service:**
   - Go to [Render](https://render.com)
   - Create new Web Service from GitHub

2. **Configure Build:**
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Get Your API URL:**
   - Copy the Render URL
   - Your API endpoint will be: `https://your-app.onrender.com/api/deep-research`

## Configuration

### Step 1: Get API Keys

1. **OpenAI API Key:**
   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Ensure you have sufficient credits

2. **Tavily API Key:**
   - Visit [Tavily](https://tavily.com/)
   - Sign up and get your API key

### Step 2: Configure in App

1. **Enter API Keys:**
   - Open your app
   - Click "Configure API Keys"
   - Enter your OpenAI and Tavily API keys
   - Enter your deployed API URL

2. **Save Configuration:**
   - Click "Save Configuration"
   - Keys are stored securely in your browser

## Usage

1. **Start Research:**
   - Fill out the project form
   - Choose "Deep Dive" for maximum quality
   - Processing may take 5-10 minutes

2. **Maximum Quality Features:**
   - 12 search queries per research
   - Advanced search depth
   - 8 results per query
   - 32,000 token limit for reports
   - Full speculative analysis

## Troubleshooting

### Common Issues:

1. **"API Keys Required" Error:**
   - Ensure both OpenAI and Tavily keys are configured
   - Check that keys are valid and have credits

2. **"Failed to fetch" Error:**
   - Verify your deployed API URL is correct
   - Check that your deployment is active

3. **Timeout Errors:**
   - Ensure your hosting platform supports long function timeouts
   - Vercel Pro plan recommended for 10-minute timeouts

### Support:

If you encounter issues, check:
- Deployment logs on your hosting platform
- Browser console for client-side errors
- API key validity and credits

## File Structure

- `api/deep-research.js` - Main research endpoint
- `vercel.json` - Vercel configuration with 10-minute timeout
- `railway.toml` - Railway deployment configuration
- `src/pages/Index.tsx` - Updated frontend with API key management

---

**You're now running maximum quality research with no limitations!** 🎉