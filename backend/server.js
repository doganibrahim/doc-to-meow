require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for frontend connection
app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL ERROR: SUPABASE_URL or SUPABASE_KEY is missing in environmental variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload a PDF or an image (PNG, JPG, JPEG).'), false);
    }
  }
});

// Root check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend service is running smoothly.' });
});

// File Upload Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    // Generate a unique filename while preserving extension
    const originalName = req.file.originalname;
    const fileExt = originalName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const filePath = `reports/${uniqueFileName}`;

    // Upload to Supabase Storage Bucket
    const { data, error } = await supabase.storage
      .from('vet-reports')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Retrieve public URL
    const { data: { publicUrl } } = supabase.storage
      .from('vet-reports')
      .getPublicUrl(filePath);

    res.status(200).json({
      message: 'File uploaded successfully!',
      fileUrl: publicUrl,
      fileName: originalName,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

  } catch (error) {
    console.error('Server upload handler error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
  console.log('Health check endpoint is available at /health');
});
