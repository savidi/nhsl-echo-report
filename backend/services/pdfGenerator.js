// backend/services/pdfGenerator.js
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');

const TEMPLATE_FILE = path.join(__dirname, '..', 'templates', 'echoReportTemplate.html');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const HEADER_LOGO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="18" fill="%23e3efff"/><path d="M48.16 70.48l-1.9-1.75C32.4 57.07 24 48.96 24 38.9 24 31.23 30.05 25 37.6 25c4.6 0 9 2.2 11.56 5.7C51.4 27.2 55.8 25 60.4 25c7.55 0 13.6 6.22 13.6 13.9 0 10.06-8.4 18.17-22.26 29.84l-1.58 1.75z" fill="%230a4f94"/></svg>';

// Register helpers used by the Handlebars template
Handlebars.registerHelper('mod', (a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (Number.isNaN(numA) || Number.isNaN(numB) || numB === 0) return 0;
    return numA % numB;
});

Handlebars.registerHelper('eq', (a, b) => {
    return a === b;
});

const PATIENT_INFO_FIELDS = [
    { key: 'Name', label: 'Patient Name' },
    { key: 'ID', label: 'Clinic ID' },
    { key: 'DOB', label: 'Date of Birth' },
    { key: 'Age', label: 'Age' },
    { key: 'Indication', label: 'Indication' },
    { key: 'Date of Intervention', label: 'Date of Intervention' },
    { key: 'Pre-Op Specify', label: 'Pre-Op Details' }
];

const SUMMARY_FIELDS = [
    { key: 'LV systolic function summary', label: 'LV systolic function' },
    { key: 'LV diastolic function summary', label: 'LV diastolic function' },
    { key: 'Valves summary', label: 'Valves summary' },
    { key: 'Conclusion', label: 'Conclusion' },
    { key: 'Recommendation', label: 'Recommendation' }
];

const ensureReportsDir = () => {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
};

const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const normalizeValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return 'N/A';
    }
    if (typeof value === 'string') {
        return value.trim() === '' ? 'N/A' : value;
    }
    return value;
};

const buildTemplateModel = (formData = {}) => {
    const upperCaseKeys = new Set([
        ...PATIENT_INFO_FIELDS.map(field => field.key),
        ...SUMMARY_FIELDS.map(field => field.key)
    ]);

    const patientInfo = PATIENT_INFO_FIELDS
        .map(field => ({
            label: field.label,
            value: field.key === 'DOB'
                ? formatDate(formData[field.key])
                : normalizeValue(formData[field.key])
        }))
        .filter(item => item.value !== 'N/A');

    const summary = SUMMARY_FIELDS
        .map(field => ({
            label: field.label,
            value: normalizeValue(formData[field.key])
        }))
        .filter(item => item.value !== 'N/A');

    const measurements = Object.entries(formData || {})
        .filter(([key]) => !upperCaseKeys.has(key))
        .map(([key, value]) => ({
            label: key,
            value: normalizeValue(value)
        }))
        .filter(item => item.value !== 'N/A')
        .sort((a, b) => a.label.localeCompare(b.label));

    return {
        reportTitle: 'Echocardiogram Report',
        generatedAt: new Date().toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        patientInfo,
        summary,
        measurements,
        headerLogo: HEADER_LOGO
    };
};

const compileTemplate = (templateData) => {
    const templateSource = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    const template = Handlebars.compile(templateSource);
    return template(templateData);
};

const generateEchoReport = async (formData = {}) => {
    ensureReportsDir();
    const templateData = buildTemplateModel(formData);
    const html = compileTemplate(templateData);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const fileName = `echo-report-${Date.now()}.pdf`;
        const filePath = path.join(REPORTS_DIR, fileName);

        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                bottom: '20mm',
                left: '12mm',
                right: '12mm'
            }
        });

        return { filePath, fileName };
    } finally {
        await browser.close();
    }
};

module.exports = { generateEchoReport };
