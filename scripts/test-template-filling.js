/**
 * Test script for verifying template downloading and filling
 */
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

// Template URLs
const TEMPLATE_URLS = {
  registration: 'https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/registration_form_template.pdf',
  trainingAgreement: 'https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/training_agreement_template.pdf',
  liabilityWaiver: 'https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/liability_waiver_template.pdf'
};

// Sample form data for testing
const SAMPLE_FORM_DATA = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phoneNo: '555-123-4567',
  streetAddress: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zipCode: '12345',
  selectedPlan: {
    title: 'Premium Plan',
    price: '$99.99',
    sessions: '12',
    duration: '3 months',
    initiationFee: '$49.99'
  },
  signatureDate: new Date().toLocaleDateString(),
  signatureDataURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACoCAMAAABt9SM9AAAAA1BMVEX///+nxBvIAAAAR0lEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO8GxYgAAb0jQ/cAAAAASUVORK5CYII='
};

/**
 * Download a template from R2
 */
async function downloadTemplate(templateUrl, outputPath) {
  console.log(`Downloading template from: ${templateUrl}`);
  
  try {
    const response = await fetch(templateUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
    
    console.log(`Template downloaded successfully to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error downloading template:', error);
    throw error;
  }
}

/**
 * List all form fields in a PDF
 */
async function listPdfFields(pdfPath) {
  console.log(`Listing form fields in: ${pdfPath}`);
  
  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`PDF has ${fields.length} form fields:`);
    
    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.getName()} (${field.constructor.name})`);
    });
    
    return fields.map(field => field.getName());
  } catch (error) {
    console.error('Error listing PDF fields:', error);
    throw error;
  }
}

/**
 * Main function to test template functionality
 */
async function testTemplates() {
  // Create output directory if it doesn't exist
  const outputDir = path.resolve('./temp-templates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Process each template
  for (const [templateName, templateUrl] of Object.entries(TEMPLATE_URLS)) {
    console.log(`\n========== Testing ${templateName} template ==========`);
    
    // Download the template
    const templatePath = path.join(outputDir, `${templateName}.pdf`);
    await downloadTemplate(templateUrl, templatePath);
    
    // List the fields in the template
    const fieldNames = await listPdfFields(templatePath);
    
    console.log(`\nTemplate ${templateName} contains ${fieldNames.length} fillable fields`);
    if (fieldNames.length === 0) {
      console.warn('WARNING: This template does not contain any fillable fields!');
      console.warn('It may not be set up properly for form filling.');
    }
  }
  
  console.log('\n========== Template Testing Complete ==========');
  console.log('All templates downloaded and analyzed successfully.');
}

// Run the test
testTemplates().catch(err => {
  console.error('Template test failed:', err);
  process.exit(1);
}); 