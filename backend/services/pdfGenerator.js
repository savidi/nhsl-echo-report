// backend/services/pdfGenerator.js

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');

const TEMPLATE_FILE = path.join(__dirname, '..', 'templates', 'echoReportTemplate.html');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

const buildTemplateModel = (formData = {}) => {
    // Helper to get value or N/A
    const getValue = (key) => formData[key] || 'N/A';

    // Format patient information
    const patientInfo = [
        { label: 'Name', value: getValue('Name') },
        { label: 'Clinic ID', value: getValue('ID') },
        { label: 'Age/Gender', value: `${getValue('Age')} / ${getValue('Gender') || 'N/A'}` },
        { label: 'Indication', value: getValue('Indication') },
        { label: 'Date of Study', value: new Date().toLocaleDateString() }
    ].filter(item => item.value !== 'N/A');

    // Organize measurements by category
    const measurements = {
        'Left Ventricle': [
            { label: 'LV EDD', value: getValue('LV EDD'), unit: 'mm' },
            { label: 'LV ESD', value: getValue('LV ESD'), unit: 'mm' },
            { label: 'IVSd', value: getValue('IVSd'), unit: 'mm' },
            { label: 'LVPWd', value: getValue('LVPWd'), unit: 'mm' },
            { label: 'EF', value: getValue('EF'), unit: '%' },
            { label: 'RWMA', value: getValue('RWMA') }
        ].filter(item => item.value !== 'N/A'),
        
        'Diastolic Function': [
            { label: 'E', value: getValue('E'), unit: 'cm/s' },
            { label: 'A', value: getValue('A'), unit: 'cm/s' },
            { label: 'E/A', value: getValue('E/A ratio') },
            { label: 'e\'', value: getValue('Medial wall e\''), unit: 'cm/s' },
            { label: 'E/e\'', value: getValue('E/e\'') }
        ].filter(item => item.value !== 'N/A'),
        
        'Chambers': [
            { label: 'LA Size', value: getValue('LA') },
            { label: 'LA Diameter', value: getValue('LA diameter'), unit: 'cm' },
            { label: 'RA Size', value: getValue('RA') },
            { label: 'RA Diameter', value: getValue('RA diameter'), unit: 'cm' },
            { label: 'RV Function', value: getValue('RV') },
            { label: 'TAPSE', value: getValue('TAPSE'), unit: 'mm' }
        ].filter(item => item.value !== 'N/A')
    };

    // Valve assessments
    const valveAssessments = {
        'Mitral Valve': {
            status: getValue('Mitral valve'),
            stenosis: getValue('Mitral stenosis'),
            regurgitation: getValue('Mitral Regurgitation'),
            specialComments: getValue('Special comments on mitral valve')
        },
        'Aortic Valve': {
            status: getValue('Aortic valve'),
            stenosis: getValue('Aortic stenosis'),
            regurgitation: getValue('Aortic regurgitation')
        },
        'Tricuspid Valve': {
            status: getValue('Tricuspid valve'),
            regurgitation: getValue('Tricuspid regurgitation')
        }
    };

    return {
        reportTitle: 'Echocardiogram Report',
        headerLogo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 96 96"><rect width="96" height="96" rx="18" fill="%23e3efff"/><path d="M48.16 70.48l-1.9-1.75C32.4 57.07 24 48.96 24 38.9 24 31.23 30.05 25 37.6 25c4.6 0 9 2.2 11.56 5.7C51.4 27.2 55.8 25 60.4 25c7.55 0 13.6 6.22 13.6 13.9 0 10.06-8.4 18.17-22.26 29.84l-1.58 1.75z" fill="%230a4f94"/></svg>',
        generatedAt: new Date().toLocaleString(),
        patientInfo,
        measurements,
        valveAssessments,
        conclusion: getValue('Conclusion') || 'No significant abnormalities detected.',
        recommendations: getValue('Recommendation') || 'Routine follow-up as clinically indicated.'
    };
};

const ensureReportsDir = () => {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
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