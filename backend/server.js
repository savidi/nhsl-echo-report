// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const { generateEchoReport } = require('./services/pdfGenerator');

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Create necessary directories if they don't exist
const createDirectories = () => {
    const dirs = ['uploads', 'reports'];
    dirs.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });
};
createDirectories();

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// ✅ API 1: Save echo report data
app.post('/api/reports', (req, res) => {
    const { formData } = req.body;
    
    try {
        // Save to database logic here
        console.log('Received form data:', formData);
        
        res.status(200).json({ 
            success: true,
            message: 'Report saved successfully',
            data: formData
        });
    } catch (error) {
        console.error('Error saving report:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to save report',
            details: error.message
        });
    }
});

// ✅ API 2: Generate PDF Report
app.post('/api/generate-pdf', async (req, res) => {
    try {
        const { formData } = req.body;
        
        if (!formData) {
            return res.status(400).json({ 
                success: false,
                error: 'No form data provided' 
            });
        }

        // Generate the PDF
        const { filePath, fileName } = await generateEchoReport(formData);
        const fileUrl = `/reports/${fileName}`;
        
        // Return the URL to download the file
        res.status(200).json({
            success: true,
            message: 'PDF generated successfully',
            fileUrl,
            fileName
        });
        
        // Clean up the file after 5 minutes
        setTimeout(() => {
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error cleaning up PDF:', err);
                else console.log(`Cleaned up PDF: ${filePath}`);
            });
        }, 5 * 60 * 1000); // 5 minutes
        
    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate PDF', 
            details: error.message 
        });
    }
});

// ✅ API 3: Download PDF
app.get('/api/download-pdf/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'reports', filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).json({ 
                    success: false,
                    error: 'Error downloading file' 
                });
            }
        });
    } else {
        res.status(404).json({ 
            success: false,
            error: 'File not found' 
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});