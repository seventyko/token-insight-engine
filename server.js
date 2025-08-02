// Railway deployment server
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const handlerModule = await import('./api/deep-research.js');
    const handler = handlerModule.default;
    
    // Create Vercel-compatible req/res objects
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
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
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