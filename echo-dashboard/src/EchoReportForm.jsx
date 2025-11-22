import React, { useState, useEffect, useCallback, useRef } from 'react';
import InputRenderer from './InputRenderer';
import { 
    FORM_FIELDS, 
    initialFormState, 
    INTERVENTION_OPTION_VALUE,
    PRE_OP_OPTION_VALUE
} from './config';
import './index.css';
import { handlePdfGeneration } from './utils/pdfService';

// --- UTILITY FUNCTION: AGE CALCULATION ---
const calculateAge = (dobString) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    const today = new Date();
    if (isNaN(dob)) return ''; 

    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
};

const EchoReportForm = () => {
    const [formData, setFormData] = useState(initialFormState);
    const [submissionMessage, setSubmissionMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const SCORE_FIELDS = ['Score Thickening', 'Score Calcification', 'Score Sub valvular', 'Score Pliability'];
    
    const isIntervention = formData['Indication'] === INTERVENTION_OPTION_VALUE;
    const isPreOp = formData['Indication'] === PRE_OP_OPTION_VALUE;

    // Update age when DOB changes
    useEffect(() => {
        const age = calculateAge(formData['DOB']);
        if (age.toString() !== formData['Age']) {
            setFormData(prev => ({ ...prev, 'Age': age.toString() }));
        }
    }, [formData['DOB'], formData['Age']]);

    // Handle form field changes
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setSubmissionMessage(null);
    }, []);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Your existing submission logic here
            console.log('Form submitted:', formData);
            setSubmissionMessage({
                type: 'success',
                text: 'Form submitted successfully!'
            });
        } catch (error) {
            console.error('Error submitting form:', error);
            setSubmissionMessage({
                type: 'error',
                text: error.message || 'Failed to submit form'
            });
        } finally {
            setLoading(false);
        }
    };

    // PDF Generation Handler
    const handleGeneratePdf = async () => {
        await handlePdfGeneration(formData, setLoading, setSubmissionMessage);
    };

    // Group fields by section
    const sections = FORM_FIELDS.reduce((acc, field) => {
        if (!acc[field.section]) {
            acc[field.section] = [];
        }
        acc[field.section].push(field);
        return acc;
    }, {});

    return (
        <div className="echo-report-container">
            <h1>Echocardiogram Report</h1>
            
            <form onSubmit={handleSubmit} className="echo-report-form">
                {Object.entries(sections).map(([sectionName, fields]) => (
                    <div key={sectionName} className="form-section">
                        <h2>{sectionName}</h2>
                        <div className="form-fields">
                            {fields.map(field => (
                                <InputRenderer
                                    key={field.name}
                                    field={field}
                                    formData={formData}
                                    handleChange={handleChange}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                <div className="form-actions">
                    <button 
                        type="button" 
                        onClick={handleGeneratePdf}
                        disabled={loading}
                        className="btn btn-primary"
                    >
                        {loading ? 'Generating PDF...' : 'Download PDF'}
                    </button>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="btn btn-secondary"
                    >
                        {loading ? 'Submitting...' : 'Save Report'}
                    </button>
                </div>

                {submissionMessage && (
                    <div className={`alert alert-${submissionMessage.type}`}>
                        {submissionMessage.text}
                    </div>
                )}
            </form>
        </div>
    );
};

export default EchoReportForm;