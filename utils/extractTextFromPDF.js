const fs = require('fs').promises;
const pdf = require('pdf-parse');
const axios = require('axios'); // Add this dependency

/**
 * Extract text from PDF file (supports both local paths and remote URLs)
 * @param {string} source - Path or URL to the PDF file
 * @returns {Promise<string>} - Extracted text content
 */
const extractTextFromPDF = async (source) => {
  try {
    let dataBuffer;
    
    // Check if the source is a URL (Cloudinary or other remote URLs)
    if (typeof source === 'string' && source.startsWith('http')) {
      console.log('Extracting text from remote PDF URL:', source);
      try {
        const response = await axios.get(source, { 
          responseType: 'arraybuffer',
          timeout: 10000 // 10 seconds timeout
        });
        dataBuffer = Buffer.from(response.data);
      } catch (downloadError) {
        console.error('Error downloading PDF:', downloadError);
        throw new Error(`Failed to download PDF: ${downloadError.message}`);
      }
    } 
    // Handle Multer file object
    else if (source && typeof source === 'object' && source.buffer) {
      console.log('Extracting text from uploaded file buffer');
      dataBuffer = source.buffer;
    }
    // Handle local file path
    else if (typeof source === 'string') {
      console.log('Extracting text from local file path:', source);
      await fs.access(source);
      dataBuffer = await fs.readFile(source);
    } else {
      throw new Error('Invalid source provided to extractTextFromPDF');
    }
    
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
    } else if (error.response && error.response.status) {
      throw new Error(`Failed to download PDF: HTTP ${error.response.status}`);
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
 * @param {string} source - Path or URL to the PDF file
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<string>} - Extracted text content
 */
const extractTextFromPDFWithRetry = async (source, maxRetries = 2) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await extractTextFromPDF(source);
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
