/**
 * Route to handle template fetching and testing
 */
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');

// Initialize R2 client
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || 'https://8903e28602247a5bf0543b9dbe1c84e9.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

// Bucket name
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'barbaby-contracts';

// Public URLs for templates
const TEMPLATE_URLS = {
  registration: 'https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/registration_form_template.pdf',
  trainingAgreement: 'https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/training_agreement_template.pdf',
  liabilityWaiver: 'https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/liability_waiver_template.pdf'
};

// Helper function to stream response to buffer
const streamToBuffer = async (stream) => {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

/**
 * GET /api/templates/list
 * List all available templates
 */
router.get('/list', async (req, res) => {
  try {
    const templateList = Object.entries(TEMPLATE_URLS).map(([name, url]) => ({
      name,
      url
    }));
    
    res.json({
      success: true,
      templates: templateList
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list templates',
      error: error.message
    });
  }
});

/**
 * GET /api/templates/:templateName
 * Get a specific template and return it as a PDF
 */
router.get('/:templateName', async (req, res) => {
  const { templateName } = req.params;
  
  try {
    // Check if template URL exists
    let templateUrl = TEMPLATE_URLS[templateName];
    
    if (!templateUrl) {
      // Try using templateName directly as R2 key
      if (templateName.endsWith('.pdf')) {
        templateUrl = `https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/${templateName}`;
      } else {
        templateUrl = `https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/${templateName}.pdf`;
      }
    }
    
    console.log(`Fetching template from: ${templateUrl}`);
    
    // Fetch the template directly from R2 public URL
    const response = await fetch(templateUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch template: ${response.status} ${response.statusText}`);
      
      // Try fallback to R2 direct access
      try {
        console.log(`Trying fallback to R2 direct access for: ${templateName}`);
        
        const key = `templates/${templateName.endsWith('.pdf') ? templateName : templateName + '.pdf'}`;
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key
        });
        
        const r2Response = await r2.send(command);
        const templateBuffer = await streamToBuffer(r2Response.Body);
        
        // Set headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${templateName}.pdf"`);
        res.setHeader('Content-Length', templateBuffer.length);
        
        // Send the PDF
        res.send(templateBuffer);
        return;
      } catch (r2Error) {
        console.error('R2 fallback failed:', r2Error);
        throw new Error(`Template not found: ${templateName}`);
      }
    }
    
    // Get the PDF as array buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${templateName}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send the PDF
    res.send(buffer);
  } catch (error) {
    console.error(`Error fetching template ${templateName}:`, error);
    res.status(404).json({
      success: false,
      message: `Template not found: ${templateName}`,
      error: error.message
    });
  }
});

/**
 * GET /api/templates/info/:templateName
 * Get information about a template, including fields
 */
router.get('/info/:templateName', async (req, res) => {
  const { templateName } = req.params;
  
  try {
    // Check if template URL exists
    let templateUrl = TEMPLATE_URLS[templateName];
    
    if (!templateUrl) {
      // Try using templateName directly as R2 key
      if (templateName.endsWith('.pdf')) {
        templateUrl = `https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/${templateName}`;
      } else {
        templateUrl = `https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/${templateName}.pdf`;
      }
    }
    
    console.log(`Fetching template info from: ${templateUrl}`);
    
    // Import pdf-lib dynamically
    const { PDFDocument } = await import('pdf-lib');
    
    // Fetch the template
    const response = await fetch(templateUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
    }
    
    // Get the PDF as array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    // Extract field information
    const fieldInfo = fields.map(field => ({
      name: field.getName(),
      type: field.constructor.name
    }));
    
    // Return information about the template
    res.json({
      success: true,
      templateName,
      url: templateUrl,
      pageCount: pdfDoc.getPageCount(),
      fieldCount: fields.length,
      fields: fieldInfo
    });
  } catch (error) {
    console.error(`Error fetching template info for ${templateName}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to get template info: ${templateName}`,
      error: error.message
    });
  }
});

module.exports = router; 