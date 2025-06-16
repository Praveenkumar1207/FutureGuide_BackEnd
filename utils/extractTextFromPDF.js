const fs = require('fs').promises;
const pdf = require('pdf-parse');

/**
 * Extract text from PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text content
 */
const extractTextFromPDF = async (filePath) => {
  try {
    await fs.access(filePath);
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer, {
      max: 0,
      version: 'v1.10.100',
    });

    const cleanText = data.text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    if (!cleanText || cleanText.length < 10) {
      throw new Error('PDF appears to be empty or contains no readable text');
    }

    return cleanText;

  } catch (error) {
    console.error('PDF extraction error:', error);

    if (error.code === 'ENOENT') {
      throw new Error('PDF file not found at the specified path');
    } else if (error.message.includes('Invalid PDF')) {
      throw new Error('Invalid or corrupted PDF file');
    } else if (error.message.includes('empty')) {
      throw new Error('PDF file contains no readable text content');
    } else {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
};

/**
 * Validate PDF file before processing
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<boolean>} - True if valid PDF
 */
const validatePDFFile = async (filePath) => {
  try {
    await fs.access(filePath);
    const dataBuffer = await fs.readFile(filePath);
    const pdfSignature = dataBuffer.slice(0, 4).toString();
    return pdfSignature === '%PDF';
  } catch (error) {
    console.error('PDF validation error:', error);
    return false;
  }
};

/**
 * Get PDF metadata information
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<object>} - PDF metadata
 */
const getPDFMetadata = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return {
      pages: data.numpages,
      info: data.info || {},
      text_length: data.text.length,
      version: data.version || 'unknown'
    };
  } catch (error) {
    console.error('PDF metadata extraction error:', error);
    throw new Error(`Failed to extract PDF metadata: ${error.message}`);
  }
};

/**
 * Extract text with enhanced error handling and retry logic
 * @param {string} filePath - Path to the PDF file
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<string>} - Extracted text content
 */
const extractTextFromPDFWithRetry = async (filePath, maxRetries = 2) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await extractTextFromPDF(filePath);
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt === maxRetries) {
        throw new Error(`Failed to extract text after ${maxRetries} attempts: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
};

// Export all utilities
module.exports = {
  extractTextFromPDF,
  extractTextFromPDFWithRetry,
  validatePDFFile,
  getPDFMetadata
};
