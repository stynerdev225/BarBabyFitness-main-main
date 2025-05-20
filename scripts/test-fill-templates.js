/**
 * Script to test filling PDF templates with sample data
 * This helps verify that templates have the correct form fields
 */
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

// Sample data for each template
const SAMPLE_DATA = {
  registration: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNo: '555-123-4567',
    dateOfBirth: '01/01/1990',
    gender_male: 'Yes',
    streetAddress: '123 Main St',
    streetAddressLine2: 'Apt 4B',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345',
    currentWeight: '185',
    goalWeight: '170',
    height: '5\'10"',
    fitnessLevel: 'Intermediate',
    emergencyContactFirstName: 'Jane',
    emergencyContactLastName: 'Doe',
    emergencyContactPhone: '555-987-6543',
    emergencyContactRelationship: 'Spouse',
    clientSignature: 'John Doe',
    signatureDate: '01/15/2023'
  },
  
  trainingAgreement: {
    firstName: 'John',
    lastName: 'Doe',
    streetAddress: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345',
    selectedPlanTitle: 'Premium Monthly',
    selectedPlanPrice: '$199',
    selectedPlanSessions: '12',
    selectedPlanDuration: '1 month',
    selectedPlanInitiationFee: '$50',
    startDate: '02/01/2023',
    trainerName: 'Alex Trainer',
    clientName: 'John Doe',
    trainerSignature: 'Alex Trainer',
    clientSignature: 'John Doe',
    trainerDate: '01/15/2023',
    clientDate: '01/15/2023'
  },
  
  liabilityWaiver: {
    firstName: 'John',
    lastName: 'Doe',
    streetAddress: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345',
    participantName: 'John Doe',
    participantSignature: 'John Doe',
    participantDate: '01/15/2023',
    clientSignature: 'John Doe',
    clientDate: '01/15/2023',
    witnessName: 'Jane Smith',
    witnessSignature: 'Jane Smith',
    witnessDate: '01/15/2023'
  }
};

// Paths to templates and output
const FILLABLE_TEMPLATES_DIR = path.resolve('./fillable-templates');
const TEST_OUTPUT_DIR = path.resolve('./test-filled-forms');

/**
 * Fill a PDF template with sample data
 */
async function fillTemplate(templateName, inputPath, outputPath) {
  console.log(`Filling template: ${templateName}`);
  
  try {
    // Make sure we have sample data for this template
    const sampleData = SAMPLE_DATA[templateName];
    if (!sampleData) {
      throw new Error(`No sample data defined for template: ${templateName}`);
    }
    
    // Load PDF document
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Get all field names in the document
    const fields = form.getFields();
    console.log(`Template has ${fields.length} form fields`);
    
    // Count how many fields we successfully filled
    let filledCount = 0;
    
    // Fill form fields with sample data
    for (const [fieldName, fieldValue] of Object.entries(sampleData)) {
      try {
        // Try to get the field
        const field = form.getField(fieldName);
        
        if (field.constructor.name === 'PDFCheckBox') {
          if (fieldValue === 'Yes') {
            field.check();
          } else {
            field.uncheck();
          }
        } else {
          field.setText(fieldValue);
        }
        
        filledCount++;
      } catch (fieldError) {
        console.warn(`Could not fill field ${fieldName}: ${fieldError.message}`);
      }
    }
    
    console.log(`Successfully filled ${filledCount} fields out of ${Object.keys(sampleData).length} sample data fields`);
    
    // Flatten the form (optional - makes it non-editable)
    // form.flatten();
    
    // Save the filled PDF
    const filledPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, filledPdfBytes);
    
    console.log(`Filled template saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`Error filling template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Main function to test filling templates
 */
async function testFillTemplates() {
  try {
    console.log('Starting template fill test...');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    
    // Template files to test
    const templates = {
      registration: 'registration_fillable.pdf',
      trainingAgreement: 'trainingAgreement_fillable.pdf',
      liabilityWaiver: 'liabilityWaiver_fillable.pdf'
    };
    
    // Process each template
    for (const [templateName, templateFile] of Object.entries(templates)) {
      console.log(`\n========== Testing ${templateName} template ==========`);
      
      const inputPath = path.join(FILLABLE_TEMPLATES_DIR, templateFile);
      const outputPath = path.join(TEST_OUTPUT_DIR, `${templateName}_filled_test.pdf`);
      
      if (!fs.existsSync(inputPath)) {
        console.warn(`Template file not found: ${inputPath}`);
        console.warn(`Run create-fillable-templates.js first to generate the templates`);
        continue;
      }
      
      await fillTemplate(templateName, inputPath, outputPath);
    }
    
    console.log('\n========== Template Fill Test Complete ==========');
    console.log(`Test-filled templates saved to: ${TEST_OUTPUT_DIR}`);
    console.log('\nNext steps:');
    console.log('1. Open the filled PDFs to verify fields were filled correctly');
    console.log('2. If fields are not filled or in wrong positions, adjust field definitions');
    console.log('3. Once satisfied, upload templates to your R2 bucket');
  } catch (error) {
    console.error('Error testing template filling:', error);
    process.exit(1);
  }
}

// Run the template fill test
testFillTemplates().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 