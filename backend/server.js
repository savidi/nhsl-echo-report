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
    const { formData } = req.body || {};

    if (!formData || typeof formData !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid or missing formData' });
    }

    // Map a few top-level fields for quick querying; store the whole payload as JSON as well
    const record = {
        patient_name: formData['Name'] || null,
        clinic_id: formData['ID'] || null,
        dob: formData['DOB'] || null,
        age: formData['Age'] || null,
        indication: formData['Indication'] || null,
        date_of_intervention: formData['Date of Intervention'] || null,
        pre_op_specify: formData['Pre-Op Specify'] || null,
        form_data_json: JSON.stringify(formData),
        pdf_path: null,
    };

    const sql = `
        INSERT INTO echo_reports (
            patient_name, clinic_id, dob, age, indication, date_of_intervention, pre_op_specify, form_data_json, pdf_path
        ) VALUES (?,?,?,?,?,?,?,?,?)
    `;
    const params = [
        record.patient_name,
        record.clinic_id,
        record.dob,
        record.age,
        record.indication,
        record.date_of_intervention,
        record.pre_op_specify,
        record.form_data_json,
        record.pdf_path,
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error saving report:', err);
            return res.status(500).json({ success: false, error: 'Failed to save report', details: err.message });
        }

        return res.status(201).json({
            success: true,
            message: 'Report saved successfully',
            id: this.lastID,
        });
    });
});

// ✅ API 1b: List echo reports (basic metadata)
app.get('/api/reports', (req, res) => {
    const sql = `SELECT id, patient_name, clinic_id, dob, age, indication, created_at FROM echo_reports ORDER BY id DESC LIMIT 100`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching reports:', err);
            return res.status(500).json({ success: false, error: 'Failed to fetch reports', details: err.message });
        }
        return res.json({ success: true, data: rows });
    });
});

// ✅ API 1c: Fetch a single report (full form data)
app.get('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    const sql = `SELECT * FROM echo_reports WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('Error fetching report:', err);
            return res.status(500).json({ success: false, error: 'Failed to fetch report', details: err.message });
        }
        if (!row) return res.status(404).json({ success: false, error: 'Report not found' });

        let formData = {};
        try {
            formData = row.form_data_json ? JSON.parse(row.form_data_json) : {};
        } catch (_) {}

        return res.json({ success: true, data: { ...row, formData } });
    });
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