// Railway deployment server
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('dist'));

// Health check endpoint for Railway
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'crypto-research-api'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'crypto-research-api'
  });
});

// Deep research API endpoint - convert Vercel handler to Express
app.post('/api/deep-research', async (req, res) => {
  try {
    // Import the handler dynamically
    const handler = (await import('./api/deep-research.js')).default;
    
    // Create mock req/res objects for the Vercel handler
    const mockReq = { 
      method: 'POST', 
      body: req.body 
    };
    const mockRes = {
      setHeader: (name, value) => res.setHeader(name, value),
      status: (code) => ({
        json: (data) => res.status(code).json(data),
        end: () => res.status(code).end()
      })
    };
    
    await handler(mockReq, mockRes);
  } catch (error) {
    console.error('Deep research error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('App not built yet');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});