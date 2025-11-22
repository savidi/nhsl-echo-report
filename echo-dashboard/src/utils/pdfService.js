const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const handlePdfGeneration = async (formData, setLoading, setSubmissionMessage) => {
    try {
        if (setLoading) setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/generate-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formData })
        });

        const payload = await response.json();
        if (!response.ok || !payload.success) {
            throw new Error(payload.error || 'Failed to generate PDF');
        }

        const downloadUrl = `${API_BASE_URL}${payload.fileUrl}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.download = payload.fileName || 'echo-report.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();

        if (setSubmissionMessage) {
            setSubmissionMessage({
                type: 'success',
                text: 'PDF generated successfully. Download should start shortly.'
            });
        }
    } catch (error) {
        console.error('PDF generation failed:', error);
        if (setSubmissionMessage) {
            setSubmissionMessage({
                type: 'error',
                text: error.message || 'Unable to generate PDF'
            });
        }
    } finally {
        if (setLoading) setLoading(false);
    }
};

