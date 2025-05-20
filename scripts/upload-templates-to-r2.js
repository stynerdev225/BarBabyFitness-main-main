/**
 * Script to upload fillable templates to Cloudflare R2
 * 
 * Before running this script:
 * 1. npm install @aws-sdk/client-s3
 * 2. Set your R2 credentials as environment variables:
 *    - R2_ACCESS_KEY_ID
 *    - R2_SECRET_ACCESS_KEY
 *    - R2_ENDPOINT (e.g. https://xxxxxxxxxxxx.r2.cloudflarestorage.com)
 *    - R2_BUCKET_NAME (e.g. barbaby-contracts)
 */

import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Local paths to the fillable templates
const TEMPLATES = {
  'registration_fillable.pdf': 'templates/registration_form_template.pdf',
  'trainingAgreement_fillable.pdf': 'templates/training_agreement_template.pdf',
  'liabilityWaiver_fillable.pdf': 'templates/liability_waiver_template.pdf'
};

// Input/output directories
const FILLABLE_TEMPLATES_DIR = path.resolve('./fillable-templates');

// R2 Configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  }
});

async function uploadTemplateToR2(localFilePath, r2Key) {
  try {
    console.log(`Uploading ${localFilePath} to R2 as ${r2Key}...`);
    
    const fileContent = fs.readFileSync(localFilePath);
    
    const params = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: r2Key,
      Body: fileContent,
      ContentType: 'application/pdf'
    };
    
    const command = new PutObjectCommand(params);
    const result = await r2Client.send(command);
    
    console.log(`Successfully uploaded ${r2Key}`);
    return result;
  } catch (error) {
    console.error(`Error uploading ${localFilePath} to R2:`, error);
    throw error;
  }
}

async function uploadAllTemplates() {
  try {
    console.log('Starting upload of fillable templates to R2...');
    
    // Check for required environment variables
    const requiredEnvVars = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_BUCKET_NAME'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
    
    // Upload each template
    for (const [localName, r2Key] of Object.entries(TEMPLATES)) {
      const localPath = path.join(FILLABLE_TEMPLATES_DIR, localName);
      
      if (!fs.existsSync(localPath)) {
        console.warn(`Template file not found: ${localPath}`);
        continue;
      }
      
      await uploadTemplateToR2(localPath, r2Key);
    }
    
    console.log('\nAll fillable templates uploaded successfully!');
    console.log(`Templates have been uploaded to your R2 bucket: ${process.env.R2_BUCKET_NAME}`);
    console.log('\nYour fillable templates are now ready to use with your application.');
  } catch (error) {
    console.error('Error uploading templates:', error);
    process.exit(1);
  }
}

// Run the upload process
uploadAllTemplates(); 