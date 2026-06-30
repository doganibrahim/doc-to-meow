require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for frontend connection
app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const gcpProjectId = process.env.GCP_PROJECT_ID;
const gcpLocation = process.env.GCP_LOCATION || 'us-central1';
const gcpApiKey = process.env.GCP_API_KEY || process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL ERROR: SUPABASE_URL or SUPABASE_KEY is missing in environmental variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Google Gen AI Client (Unified SDK for Vertex AI / AI Studio)
let ai = null;
const hasGcpProject = !!gcpProjectId;
const hasApiKey = !!gcpApiKey;

if (hasApiKey || hasGcpProject) {
  // If using Vertex AI, project and location must not be passed directly in constructor options 
  // along with the API key. We set them as environment variables so the SDK resolves them automatically.
  if (hasGcpProject) {
    process.env.GOOGLE_CLOUD_PROJECT = gcpProjectId;
    process.env.GOOGLE_CLOUD_LOCATION = gcpLocation;
  }

  const config = {};
  if (hasApiKey) {
    config.apiKey = gcpApiKey;
  }
  if (hasGcpProject) {
    config.vertexai = true;
  }
  ai = new GoogleGenAI(config);
} else {
  console.warn('WARNING: GCP_API_KEY, GEMINI_API_KEY, or GCP_PROJECT_ID is missing. Agent 1 (Data Extractor) will not work.');
}

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

// File Delete Endpoint
app.delete('/api/upload', async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) {
      return res.status(400).json({ error: 'No fileUrl provided.' });
    }

    // Parse the filename from the public URL
    const parts = fileUrl.split('/reports/');
    if (parts.length < 2) {
      return res.status(400).json({ error: 'Invalid fileUrl format.' });
    }
    const fileName = parts[1];
    const filePath = `reports/${fileName}`;

    const { data, error } = await supabase.storage
      .from('vet-reports')
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    res.status(200).json({ message: 'File deleted successfully!', data });
  } catch (error) {
    console.error('Server delete handler error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Data Extractor Agent (Agent 1) Route
app.post('/api/extract', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Google Gen AI (Gemini) is not configured on this server. Please set GCP_API_KEY/GEMINI_API_KEY and GCP_PROJECT_ID in .env.' });
    }

    const { fileUrl, fileType } = req.body;
    if (!fileUrl || !fileType) {
      return res.status(400).json({ error: 'fileUrl and fileType are required.' });
    }

    // Fetch the file as ArrayBuffer from Supabase storage
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return res.status(fileResponse.status).json({
        error: `Failed to fetch file from storage: ${fileResponse.statusText}`
      });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Prepare generative model part (inlineData format)
    const generativePart = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: fileType
      }
    };

    // Request text extraction using the new unified SDK
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        generativePart,
        'Extract all text and tabular data from this veterinary document.'
      ],
      config: {
        systemInstruction: "You are Agent 1 (The Data Extractor) for veterinary records. Your only task is to extract ALL raw text, values, tables, and handwritten annotations from the provided document. Do NOT translate medical jargon, do NOT write care recommendations, do NOT summarize, and do NOT make any medical assumptions. Return ONLY the exact raw text data found in the document, keeping layout formatting where appropriate (e.g. Markdown tables for structured data).",
        temperature: 0.2,
      }
    });

    const extractedText = response.text || '';

    res.status(200).json({ extractedText });

  } catch (error) {
    console.error('Server extract handler error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
  console.log('Health check endpoint is available at /health');
});
