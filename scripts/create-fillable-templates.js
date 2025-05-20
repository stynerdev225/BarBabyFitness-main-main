/**
 * Script to create fillable PDF templates for BarBaby Fitness
 * This will download existing templates and create new ones with proper form fields
 */
import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fetch from 'node-fetch';

// Template URLs
const TEMPLATE_URLS = {
  registration: 'https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/registration_form_template.pdf',
  trainingAgreement: 'https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/training_agreement_template.pdf',
  liabilityWaiver: 'https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/templates/liability_waiver_template.pdf'
};

// Where to save the files
const OUTPUT_DIR = path.resolve('./fillable-templates');
const BACKUP_DIR = path.resolve('./original-templates');

// Form field definitions for each template
const FORM_FIELDS = {
  registration: [
    // Personal Information
    { name: 'firstName', type: 'text', rect: [100, 700, 200, 720] },
    { name: 'lastName', type: 'text', rect: [300, 700, 400, 720] },
    { name: 'email', type: 'text', rect: [100, 660, 250, 680] },
    { name: 'phoneNo', type: 'text', rect: [300, 660, 400, 680] },
    { name: 'dateOfBirth', type: 'text', rect: [100, 620, 200, 640] },
    
    // Gender (Radio Buttons)
    { name: 'gender_male', type: 'checkbox', rect: [100, 580, 120, 600] },
    { name: 'gender_female', type: 'checkbox', rect: [150, 580, 170, 600] },
    { name: 'gender_other', type: 'checkbox', rect: [200, 580, 220, 600] },
    
    // Additional Information (Checkboxes)
    { name: 'firstTimeGym', type: 'checkbox', rect: [100, 540, 120, 560] },
    { name: 'interestedGroupClasses', type: 'checkbox', rect: [200, 540, 220, 560] },
    { name: 'interestedPersonalTraining', type: 'checkbox', rect: [100, 520, 120, 540] },
    { name: 'needNutritionGuidance', type: 'checkbox', rect: [200, 520, 220, 540] },
    
    // Address
    { name: 'streetAddress', type: 'text', rect: [100, 480, 400, 500] },
    { name: 'streetAddressLine2', type: 'text', rect: [100, 450, 400, 470] },
    { name: 'city', type: 'text', rect: [100, 420, 200, 440] },
    { name: 'state', type: 'text', rect: [220, 420, 300, 440] },
    { name: 'zipCode', type: 'text', rect: [320, 420, 400, 440] },
    
    // Health Metrics
    { name: 'currentWeight', type: 'text', rect: [100, 380, 160, 400] },
    { name: 'goalWeight', type: 'text', rect: [180, 380, 240, 400] },
    { name: 'height', type: 'text', rect: [260, 380, 320, 400] },
    { name: 'fitnessLevel', type: 'text', rect: [340, 380, 400, 400] },
    
    // Emergency Contact
    { name: 'emergencyContactFirstName', type: 'text', rect: [100, 340, 200, 360] },
    { name: 'emergencyContactLastName', type: 'text', rect: [220, 340, 320, 360] },
    { name: 'emergencyContactPhone', type: 'text', rect: [100, 310, 200, 330] },
    { name: 'emergencyContactRelationship', type: 'text', rect: [220, 310, 320, 330] },
    
    // Medical Information
    { name: 'hasMedicalConditions', type: 'checkbox', rect: [100, 270, 120, 290] },
    
    // Medical Conditions Checkboxes
    { name: 'heartCondition', type: 'checkbox', rect: [100, 240, 120, 260] },
    { name: 'highBloodPressure', type: 'checkbox', rect: [200, 240, 220, 260] },
    { name: 'asthma', type: 'checkbox', rect: [100, 220, 120, 240] },
    { name: 'jointIssues', type: 'checkbox', rect: [200, 220, 220, 240] },
    { name: 'diabetes', type: 'checkbox', rect: [100, 200, 120, 220] },
    { name: 'allergies', type: 'checkbox', rect: [200, 200, 220, 220] },
    
    // Additional Medical
    { name: 'medicalDetails', type: 'text', rect: [100, 160, 400, 190] },
    { name: 'consentEmergencyTreatment', type: 'checkbox', rect: [100, 140, 120, 160] },
    { name: 'wearsMedicalAlert', type: 'checkbox', rect: [200, 140, 220, 160] },
    
    // Membership
    { name: 'membershipDuration', type: 'text', rect: [100, 100, 200, 120] },
    { name: 'preferredStartDate', type: 'text', rect: [100, 70, 200, 90] },
    { name: 'agreeToTerms', type: 'checkbox', rect: [300, 70, 320, 90] },
    
    // Signature
    { name: 'clientSignature', type: 'text', rect: [100, 30, 300, 50] },
    { name: 'signatureDate', type: 'text', rect: [320, 30, 400, 50] }
  ],
  
  trainingAgreement: [
    // Personal Information
    { name: 'firstName', type: 'text', rect: [100, 700, 200, 720] },
    { name: 'lastName', type: 'text', rect: [300, 700, 400, 720] },
    
    // Address
    { name: 'streetAddress', type: 'text', rect: [100, 620, 400, 640] },
    { name: 'city', type: 'text', rect: [100, 590, 200, 610] },
    { name: 'state', type: 'text', rect: [220, 590, 300, 610] },
    { name: 'zipCode', type: 'text', rect: [320, 590, 400, 610] },
    
    // Plan Details
    { name: 'selectedPlanTitle', type: 'text', rect: [100, 550, 300, 570] },
    { name: 'selectedPlanPrice', type: 'text', rect: [320, 550, 400, 570] },
    { name: 'selectedPlanSessions', type: 'text', rect: [100, 520, 200, 540] },
    { name: 'selectedPlanDuration', type: 'text', rect: [220, 520, 320, 540] },
    { name: 'selectedPlanInitiationFee', type: 'text', rect: [340, 520, 400, 540] },
    { name: 'startDate', type: 'text', rect: [100, 490, 200, 510] },
    
    // Trainer & Client Info
    { name: 'trainerName', type: 'text', rect: [100, 450, 250, 470] },
    { name: 'clientName', type: 'text', rect: [270, 450, 400, 470] },
    
    // Signatures
    { name: 'trainerSignature', type: 'text', rect: [100, 100, 250, 120] },
    { name: 'clientSignature', type: 'text', rect: [270, 100, 400, 120] },
    { name: 'trainerDate', type: 'text', rect: [100, 70, 180, 90] },
    { name: 'clientDate', type: 'text', rect: [270, 70, 350, 90] }
  ],
  
  liabilityWaiver: [
    // Personal Information
    { name: 'firstName', type: 'text', rect: [100, 700, 200, 720] },
    { name: 'lastName', type: 'text', rect: [300, 700, 400, 720] },
    
    // Address
    { name: 'streetAddress', type: 'text', rect: [100, 620, 400, 640] },
    { name: 'city', type: 'text', rect: [100, 590, 200, 610] },
    { name: 'state', type: 'text', rect: [220, 590, 300, 610] },
    { name: 'zipCode', type: 'text', rect: [320, 590, 400, 610] },
    
    // Participant
    { name: 'participantName', type: 'text', rect: [100, 550, 300, 570] },
    
    // Signatures
    { name: 'participantSignature', type: 'text', rect: [100, 100, 250, 120] },
    { name: 'participantDate', type: 'text', rect: [280, 100, 360, 120] },
    { name: 'clientSignature', type: 'text', rect: [100, 70, 250, 90] },
    { name: 'clientDate', type: 'text', rect: [280, 70, 360, 90] },
    { name: 'witnessName', type: 'text', rect: [100, 40, 200, 60] },
    { name: 'witnessSignature', type: 'text', rect: [220, 40, 350, 60] },
    { name: 'witnessDate', type: 'text', rect: [360, 40, 400, 60] }
  ]
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
 * Create a fillable PDF with proper form fields
 */
async function createFillablePdf(templateName, templatePath, outputPath) {
  console.log(`Creating fillable PDF for ${templateName}...`);
  
  try {
    // Load the existing PDF
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Get the form and create the appropriate fields
    const form = pdfDoc.getForm();
    const fields = FORM_FIELDS[templateName] || [];
    
    if (fields.length === 0) {
      throw new Error(`No field definitions found for ${templateName}`);
    }
    
    // Add fields to the form
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    
    console.log(`PDF dimensions: ${width} x ${height}`);
    console.log(`Adding ${fields.length} form fields to ${templateName}`);
    
    fields.forEach(field => {
      try {
        if (field.type === 'text') {
          const textField = form.createTextField(field.name);
          // Convert to PDF coordinates (origin at bottom-left)
          const [x, y, x2, y2] = field.rect;
          textField.addToPage(page, { 
            x, 
            y: height - y2, // Convert from top-left to bottom-left origin
            width: x2 - x, 
            height: y2 - y,
            borderWidth: 1,
            borderColor: rgb(0.75, 0.75, 0.75)
          });
          textField.setFontSize(10);
        } else if (field.type === 'checkbox') {
          const checkBox = form.createCheckBox(field.name);
          const [x, y, x2, y2] = field.rect;
          checkBox.addToPage(page, { 
            x, 
            y: height - y2, // Convert from top-left to bottom-left origin
            width: 15, 
            height: 15,
            borderWidth: 1,
            borderColor: rgb(0.75, 0.75, 0.75)
          });
        }
      } catch (fieldError) {
        console.warn(`Error creating field ${field.name}:`, fieldError.message);
      }
    });
    
    // Save the PDF with form fields
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log(`Created fillable PDF: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`Error creating fillable PDF for ${templateName}:`, error);
    throw error;
  }
}

/**
 * Create a blank PDF with fields for testing
 */
async function createBlankFillablePdf(templateName, outputPath) {
  console.log(`Creating blank fillable PDF for ${templateName}...`);
  
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 800]);
    
    // Add a title
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(`${templateName.charAt(0).toUpperCase() + templateName.slice(1)} Template`, {
      x: 50,
      y: 750,
      size: 20,
      font
    });
    
    // Add subtitle explaining this is a test template
    page.drawText('Fillable Form Fields Template - For Testing', {
      x: 50,
      y: 720,
      size: 12,
      font
    });
    
    // Get form and add fields
    const form = pdfDoc.getForm();
    const fields = FORM_FIELDS[templateName] || [];
    
    if (fields.length === 0) {
      throw new Error(`No field definitions found for ${templateName}`);
    }
    
    console.log(`Adding ${fields.length} form fields to blank ${templateName} template`);
    
    // Keep track of vertical position
    let yPos = 680;
    
    fields.forEach(field => {
      try {
        // Add field label
        page.drawText(field.name, {
          x: 50,
          y: yPos,
          size: 10,
          font
        });
        
        if (field.type === 'text') {
          const textField = form.createTextField(field.name);
          textField.addToPage(page, { 
            x: 200, 
            y: yPos - 15, 
            width: 200, 
            height: 20,
            borderWidth: 1,
            borderColor: rgb(0.75, 0.75, 0.75)
          });
          textField.setFontSize(10);
        } else if (field.type === 'checkbox') {
          const checkBox = form.createCheckBox(field.name);
          checkBox.addToPage(page, { 
            x: 200, 
            y: yPos - 15,
            width: 15, 
            height: 15,
            borderWidth: 1,
            borderColor: rgb(0.75, 0.75, 0.75)
          });
        }
        
        // Move to next line
        yPos -= 30;
        
        // Add a new page if we reach the bottom
        if (yPos < 50) {
          page = pdfDoc.addPage([600, 800]);
          yPos = 750;
        }
      } catch (fieldError) {
        console.warn(`Error creating field ${field.name}:`, fieldError.message);
      }
    });
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log(`Created blank fillable PDF: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`Error creating blank fillable PDF for ${templateName}:`, error);
    throw error;
  }
}

/**
 * Main function to create fillable templates
 */
async function createFillableTemplates() {
  try {
    console.log('Starting fillable template creation process...');
    
    // Create output directories if they don't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Process each template
    for (const [templateName, templateUrl] of Object.entries(TEMPLATE_URLS)) {
      console.log(`\n========== Processing ${templateName} template ==========`);
      
      try {
        // Download original template
        const originalPath = path.join(BACKUP_DIR, `${templateName}.pdf`);
        await downloadTemplate(templateUrl, originalPath);
        
        // Create fillable version from original
        const fillablePath = path.join(OUTPUT_DIR, `${templateName}_fillable.pdf`);
        await createFillablePdf(templateName, originalPath, fillablePath);
        
        // Create blank version with fields
        const blankPath = path.join(OUTPUT_DIR, `${templateName}_blank_fillable.pdf`);
        await createBlankFillablePdf(templateName, blankPath);
        
        console.log(`\nTemplate processing complete for ${templateName}`);
        console.log(`  - Original saved to: ${originalPath}`);
        console.log(`  - Fillable version: ${fillablePath}`);
        console.log(`  - Blank fillable: ${blankPath}`);
      } catch (templateError) {
        console.error(`Error processing ${templateName} template:`, templateError);
      }
    }
    
    console.log('\n========== Template Creation Complete ==========');
    console.log(`Original templates backed up to: ${BACKUP_DIR}`);
    console.log(`Fillable templates created in: ${OUTPUT_DIR}`);
    console.log('\nNext steps:');
    console.log('1. Check the fillable templates to ensure fields are correctly positioned');
    console.log('2. Run the test-templates script to verify fields are detected');
    console.log('3. Upload the fillable templates to your Cloudflare R2 bucket');
  } catch (error) {
    console.error('Error creating fillable templates:', error);
    process.exit(1);
  }
}

// Run the template creation process
createFillableTemplates().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 