// backend/services/pdfGenerator.js

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');

const TEMPLATE_FILE = path.join(__dirname, '..', 'templates', 'echoReportTemplate.html');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

// Register helpers
if (!Handlebars.helpers.or) {
    Handlebars.registerHelper('or', function(a, b) {
        return a || b;
    });
}

const buildTemplateModel = (formData = {}) => {
    // Helper to get value or N/A
    const getValue = (key) => {
        const v = formData[key];
        if (v === undefined || v === null) return 'N/A';
        if (typeof v === 'string' && v.trim() === '') return 'N/A';
        return v;
    };

    // Format patient information
    const patientInfo = [
        { label: 'Name', value: getValue('Name') },
        { label: 'Clinic ID', value: getValue('ID') },
        { label: 'Date of Birth', value: getValue('DOB') },
        { label: 'Age', value: getValue('Age') },
        { label: 'Gender', value: getValue('Gender') },
        { label: 'Indication', value: getValue('Indication') },
        { label: 'Date of Intervention', value: getValue('Date of Intervention') },
        { label: 'Pre-Op Specify', value: getValue('Pre-Op Specify') },
        { label: 'Date of Study', value: new Date().toLocaleDateString() }
    ].filter(item => item.value !== 'N/A');

    // Organize measurements by category
    const measurements = {
        'LV Dimensions and Systolic Assessment': [
            { label: 'LV EDD', value: getValue('LV EDD'), unit: 'mm' },
            { label: 'LV ESD', value: getValue('LV ESD'), unit: 'mm' },
            { label: 'IVSd', value: getValue('IVSd'), unit: 'mm' },
            { label: 'LVPWd', value: getValue('pwD'), unit: 'mm' },
            { label: 'EF', value: getValue('EF'), unit: '%' },
            { label: 'RWMA', value: getValue('RWMA') },
            { label: 'LV cavity', value: getValue('LV cavity') },
            { label: 'LV Systolic Function Comment', value: getValue('Systolic Comment') }
        ].filter(item => item.value !== 'N/A'),
        
        'LV Diastolic Function Assessment': [
            { label: 'E', value: getValue('E'), unit: 'cm/s' },
            { label: 'A', value: getValue('A'), unit: 'cm/s' },
            { label: 'E/A ratio', value: getValue('E/A ratio') },
            { label: "Medial wall e'", value: getValue("Medial wall e'"), unit: 'cm/s' },
            { label: "E/e'", value: getValue("E/e'") }
        ].filter(item => item.value !== 'N/A'),
        
        'Chamber Dimensions and Function': [
            { label: 'LA', value: getValue('LA') },
            { label: 'LA diameter', value: getValue('LA diameter'), unit: 'cm' },
            { label: 'LA Comments', value: getValue('LA Comments') },
            { label: 'RA', value: getValue('RA') },
            { label: 'RA diameter', value: getValue('RA diameter'), unit: 'cm' },
            { label: 'RA Comments', value: getValue('RA Comments') },
            { label: 'RV', value: getValue('RV') },
            { label: 'RV Comments', value: getValue('RV Comments') },
            { label: 'TAPSE', value: getValue('TAPSE'), unit: 'cm' }
        ].filter(item => item.value !== 'N/A'),

        'Mitral Valve Assessment': [
            { label: 'Vegetations', value: getValue('MV Vegatations') },
            { label: 'Comment on vegetation', value: getValue('MV Comment on vegetation') },
            { label: 'VC', value: getValue('VC'), unit: 'cm' },
            { label: 'EROA (PISA)', value: getValue('EROA (PISA)'), unit: 'cm²' },
            { label: 'Mitral valve area (Trace)', value: getValue('Mitral valve area (Trace)'), unit: 'cm²' },
            { label: 'Mitral valve area (Doppler)', value: getValue('Mitral valve area (Doppler)'), unit: 'cm²' },
            { label: 'Mitral valve Max PG', value: getValue('Mitral valve Max PG'), unit: 'mmHg' },
            { label: 'Mitral Valve Mean PG', value: getValue('Mitral Valve Mean PG'), unit: 'mmHg' },
            { label: 'Thickening', value: getValue('Score Thickening') },
            { label: 'Calcification', value: getValue('Score Calcification') },
            { label: 'Sub valvular', value: getValue('Score Sub valvular') },
            { label: 'Pliability', value: getValue('Score Pliability') },
            { label: 'Total Score', value: getValue('Score Total') },
            { label: 'Special comments on mitral valve', value: getValue('Special comments on mitral valve') }
        ].filter(item => item.value !== 'N/A'),

        'Aortic Valve Assessment': [
            { label: 'Vegetations', value: getValue('AV Vegatations') },
            { label: 'Comment on vegetation', value: getValue('AV Comment on vegetation') },
            { label: 'Aortic annulus', value: getValue('Aortic annulus'), unit: 'cm' },
            { label: 'Aortic sinuses', value: getValue('Aortic sinuses'), unit: 'cm' },
            { label: 'Sino - tubular junction', value: getValue('Sino - tubular junction'), unit: 'cm' },
            { label: 'Ascending aorta', value: getValue('Ascending aorta'), unit: 'cm' },
            { label: 'AI P1/2', value: getValue('AI P1/2'), unit: 'm/s' },
            { label: 'LVOT diameter (AR)', value: getValue('LVOT diamater'), unit: 'mm' },
            { label: 'Regurgitant jet width', value: getValue('Regurgitant jet width'), unit: 'mm' },
            { label: 'Jet width/ LVOT diameter', value: getValue('Jet width/ LOVT diameter') },
            { label: 'Diastolic flow reversal in descending aorta', value: getValue('Diastolic flow reversal in decending aorta') },
            { label: 'Aortic valve maximum pressure gradient', value: getValue('Aortic valve maximum pressure gradient'), unit: 'mmHg' },
            { label: 'Aortic valve mean pressure gradient', value: getValue('Aortic valve mean pressure gradient'), unit: 'mmHg' },
            { label: 'Aortic valve VTI', value: getValue('Aortic valve VTI'), unit: 'cm' },
            { label: 'LVOT VTI', value: getValue('LVOT VTI'), unit: 'cm' },
            { label: 'LVOT Diameter', value: getValue('LVOT Diameter'), unit: 'cm' },
            { label: 'AVA', value: getValue('AVA'), unit: 'cm²' }
        ].filter(item => item.value !== 'N/A'),

        'Tricuspid Valve Assessment': [
            { label: 'Vegetations', value: getValue('TV Vegatations') },
            { label: 'Comment on vegetation', value: getValue('TV Comment on vegetation') },
            { label: 'TRPG', value: getValue('TRPG'), unit: 'mmHg' },
            { label: 'VC diameter', value: getValue('VC diameter'), unit: 'mm' },
            { label: 'EROA (PISA)', value: getValue('EROA (pisa)'), unit: 'mm²' },
            { label: 'Hepatic vein flow', value: getValue('Hepatic vein flow') }
        ].filter(item => item.value !== 'N/A'),

        'Pulmonary Valve Assessment': [
            { label: 'Vegetations', value: getValue('PV Vegatations') },
            { label: 'Comment on vegetation', value: getValue('PV Comment on vegetation') },
            { label: 'Pulmonary valve maximum pressure gradients', value: getValue('Pulmonary valve maximum pressure gradients'), unit: 'mmHg' },
            { label: 'Pulmonary valve mean pressure gradient', value: getValue('Pulmonary valve mean pressure gradient'), unit: 'mmHg' },
            { label: 'Peak velocity', value: getValue('Peak velocity'), unit: 'cm/s' }
        ].filter(item => item.value !== 'N/A'),

        'Septal Assessment': [
            { label: 'Intra atrial septum', value: getValue('Intra atrial septum') },
            { label: 'IAS Special Comments', value: getValue('IAS Special Comments') },
            { label: 'Intra ventricular septum', value: getValue('Intra ventricular septum') },
            { label: 'IVS Special Comments', value: getValue('IVS Special Comments') }
        ].filter(item => item.value !== 'N/A'),

        'Report Summary and Recommendations': [
            { label: 'Pericardium', value: getValue('Pericardium') },
            { label: 'Effusion Measurement (Anterior)', value: getValue('Effusion Measurement Anterior'), unit: 'mm' },
            { label: 'Effusion Measurement (Inferior)', value: getValue('Effusion Measurement Inferior'), unit: 'mm' },
            { label: 'Effusion Measurement (Medial)', value: getValue('Effusion Measurement Medial'), unit: 'mm' },
            { label: 'Effusion Measurement (Lateral)', value: getValue('Effusion Measurement Lateral'), unit: 'mm' },
            { label: 'Effusion Measurement (Apical)', value: getValue('Effusion Measurement Apical'), unit: 'mm' },
            { label: 'LV systolic function summary', value: getValue('LV systolic function summary') },
            { label: 'LV diastolic function summary', value: getValue('LV diastolic function summary') },
            { label: 'Valves summary', value: getValue('Valves summary') }
        ].filter(item => item.value !== 'N/A')
    };

    // Remove measurement sections that have no items (compute AFTER measurements is built)
    const filteredMeasurements = Object.fromEntries(
        Object.entries(measurements).filter(([, items]) => Array.isArray(items) && items.length > 0)
    );

    // No separate valve summary block; all valve data is shown within measurement sections

    return {
        reportTitle: 'Echocardiogram Report',
        headerLogo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 96 96"><rect width="96" height="96" rx="18" fill="%23e3efff"/><path d="M48.16 70.48l-1.9-1.75C32.4 57.07 24 48.96 24 38.9 24 31.23 30.05 25 37.6 25c4.6 0 9 2.2 11.56 5.7C51.4 27.2 55.8 25 60.4 25c7.55 0 13.6 6.22 13.6 13.9 0 10.06-8.4 18.17-22.26 29.84l-1.58 1.75z" fill="%230a4f94"/></svg>',
        generatedAt: new Date().toLocaleString(),
        patientInfo,
        measurements: filteredMeasurements
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