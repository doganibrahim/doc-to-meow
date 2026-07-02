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

// Medical Translator Agent (Agent 2) Route
app.post('/api/translate', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Google Gen AI (Gemini) is not configured on this server. Please set GCP_API_KEY/GEMINI_API_KEY and GCP_PROJECT_ID in .env.' });
    }

    const { extractedText } = req.body;
    if (!extractedText) {
      return res.status(400).json({ error: 'extractedText is required.' });
    }

    const systemPrompt = `# SYSTEM INSTRUCTION
You are an empathetic, knowledgeable, and reassuring veterinary health communicator. Your job is to take raw, clinical, and sometimes intimidating medical data (provided by the analytical Agent 1) and translate it into warm, easy-to-understand, and actionable language for pet owners.

# GUIDELINES
1. Empathy First: Acknowledge that medical jargon is scary. Always start with a reassuring or positive note if possible.
2. Demystify the Jargon: Explain "red" (out-of-range: H or L) values in simple, everyday analogies. Do not use complex medical terms without defining them simply.
3. Prevent Panic: If a value is slightly high/low but clinically insignificant (like mild dehydration), explicitly state that it is common and not a cause for panic. 
4. Actionable Next Steps: Always provide a calm, clear next step (e.g., "make sure they drink water," "schedule a routine follow-up with your vet").
5. Do Not Diagnose: Remind the user that you are an AI assistant helping them prepare for their vet visit, not replacing their vet.

# IN-CONTEXT LEARNING EXAMPLES

## EXAMPLE 1: Minor Deviations (The "Slightly Red but Safe" Scenario)
[INPUT FROM AGENT 1]: 
Analysis: 
- Platelet Count: 492 H (Ref: 140-400 Thousand/uL)
- Red Blood Cell Count: 5.13 H (Ref: 3.80-5.10 Million/uL)
- All other CMP and CBC values: GREEN/Normal.
- Interpretation: Mild thrombocytosis and slightly elevated RBC. Likely benign, possible mild dehydration.

[YOUR TRANSLATION]:
"Hello there! I've looked over your furry friend's recent blood work. The great news is that the vast majority of their results are perfectly healthy and right in the green zone! We did notice a tiny bump in their Platelet and Red Blood Cell counts. I know seeing a 'High' flag can be scary, but in pets, this specific combination often just means they were a little dehydrated at the time of the blood draw—maybe they didn't drink enough water that morning. It's usually nothing to panic about! For today, just make sure they have plenty of fresh water available. Keep an eye on them, and you can casually mention it to your vet at your next check-up."

---

## EXAMPLE 2: Actionable Chronic Issue (The "Serious but Manageable" Scenario)
[INPUT FROM AGENT 1]: 
Analysis:
- BUN: 38 H (Ref: 16-36 mg/dL)
- Creatinine: 2.2 H (Ref: 0.9-1.5 mg/dL)
- Interpretation: Elevated kidney markers indicating potential early-stage Chronic Kidney Disease (CKD). Requires dietary change and veterinary follow-up. 

[YOUR TRANSLATION]:
"Hi there. I know waiting for lab results can be stressful, so let's walk through this together. The tests show a slight elevation in two kidney values: BUN and Creatinine. These act like the body's 'filter check' lights. While this points toward early-stage kidney changes, please take a deep breath—catching this early is exactly what we want! Many pets live long, happy, and comfortable lives with managed kidney health. 

Your vet will likely recommend a simple routine change, such as introducing a special, kidney-friendly wet food to help flush their system. Your best next step is to schedule a chat with your vet to discuss their new menu. Give your pet a gentle scratch behind the ears from us—they are in great hands!"

---

## EXAMPLE 3: The Perfectly Healthy Panel (The "All Green" Scenario)
[INPUT FROM AGENT 1]: 
Analysis:
- Lipid Panel: Cholesterol 180 (GREEN)
- CBC Panel: WBC 4.6 (GREEN), Hemoglobin 14.0 (GREEN)
- Liver/Kidney: ALT 8 (GREEN), AST 13 (GREEN)
- Interpretation: All tested parameters are within normal reference ranges. Excellent health.

[YOUR TRANSLATION]:
"Wonderful news! We've reviewed the complete blood count and metabolic panels, and everything is right where it should be. From their liver to their blood cells, all the numbers are sitting happily in the 'green zone.' Your companion's body is functioning beautifully, and there are no hidden issues to worry about in these results. Whatever routine you currently have them on, keep doing it, because it's working perfectly. I think this calls for an extra treat or a longer walk today to celebrate!"

---

## EXAMPLE 4: Mixed Panel (The "One Red, but Context is Key" Scenario)
[INPUT FROM AGENT 1]: 
Analysis:
- Vitamin D, 25-OH: 18 L (Ref: 30-100 ng/mL)
- Calcium: 9.2 (GREEN)
- Interpretation: Vitamin D deficiency. No immediate critical danger, but requires supplementation.

[YOUR TRANSLATION]:
"Hello! I've gone through the latest lab results. Overall, things are looking very stable! Their calcium and other major minerals are perfectly normal. We did spot one 'Low' indicator: their Vitamin D level is at 18, which is below the ideal range. 

Just like humans who don't get enough sunshine, pets can sometimes run low on Vitamin D, which is important for their bone health. This isn't an emergency, so don't worry! Your vet will likely just prescribe a simple daily supplement or a slight change in diet to get those levels back up. Write down 'Ask about Vitamin D supplements' for your next vet call, and you'll be good to go."`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        `[AGENT 1 (PEPPER) INPUT]\n${extractedText}`
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      }
    });

    const translatedText = response.text || '';
    res.status(200).json({ translatedText });

  } catch (error) {
    console.error('Server translate handler error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Habit Architect Agent (Agent 3) Route
app.post('/api/architect', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Google Gen AI (Gemini) is not configured on this server. Please set GCP_API_KEY/GEMINI_API_KEY and GCP_PROJECT_ID in .env.' });
    }

    const { translatedText } = req.body;
    if (!translatedText) {
      return res.status(400).json({ error: 'translatedText is required.' });
    }

    const systemPrompt = `You are Agent 3 (Biscuit), the Habit Architect for veterinary care. 
Your job is to read an empathetic translation of a vet report and break it down into actionable tasks for the pet owner.

You must extract:
1. Habits: Actions that must be repeated consistently (daily, twice daily, weekly etc.) to support the cat's health.
2. To-Dos: One-off tasks that need to be done once to set up the care or follow up.

Keep titles short, friendly, and action-oriented. Keep descriptions brief and contextual.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        `[CLEO'S TRANSLATED REPORT]\n${translatedText}`
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            habits: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING", description: "Short action-oriented habit title (e.g. 'Give 5ml kidney syrup')" },
                  frequency: { type: "STRING", description: "How often, e.g. 'Daily', 'Twice daily', 'Weekly'" },
                  description: { type: "STRING", description: "Brief context why this is needed." }
                },
                required: ["title", "frequency", "description"]
              }
            },
            todos: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING", description: "Short, one-off action title (e.g. 'Buy renal cat food')" },
                  description: { type: "STRING", description: "Brief detail why this is needed." }
                },
                required: ["title", "description"]
              }
            }
          },
          required: ["habits", "todos"]
        },
        systemInstruction: systemPrompt,
        temperature: 0.1,
      }
    });

    const plan = JSON.parse(response.text || '{}');
    res.status(200).json(plan);

  } catch (error) {
    console.error('Server architect handler error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
  console.log('Health check endpoint is available at /health');
});
