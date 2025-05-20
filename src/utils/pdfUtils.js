import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { PDFDocument } from 'pdf-lib';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * BarBabyFitness PDF Manager
 * Handles PDF form filling and storage in Cloudflare R2 for the specific forms:
 * - registration_form_template.pdf
 * - training_agreement_template.pdf
 * - liability_waiver_template.pdf
 */
export class PDFManager {
  constructor() {
    // Initialize R2 client
    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: 'https://8903e28602247a5bf0543b9dbe1c84e9.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: 'f78f5384df6b4672ae21e9ecb2c8508b',
        secretAccessKey: '161ee32b241cd7ab004148906b8f5e00b71a1d0e437de73851e26981ef1f0d85',
      },
      forcePathStyle: true
    });

    // Initialize Resend for email
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set in environment variables');
      throw new Error('RESEND_API_KEY is required');
    }
    this.resend = new Resend(resendApiKey);
    
    // PDF form templates
    this.pdfForms = {
      registration: 'templates/registration_form_template.pdf',
      agreement: 'templates/training_agreement_template.pdf',
      waiver: 'templates/liability_waiver_template.pdf'
    };
  }

  /**
   * Helper function to convert stream to buffer
   */
  async streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Get a PDF template from R2
   */
  async getTemplate(templateName) {
    try {
      // Get template from R2 - use direct path with no folder prefix
      const command = new GetObjectCommand({
        Bucket: 'barbaby-contracts',
        Key: templateName,
      });
      
      console.log(`Fetching template from: barbaby-contracts/${templateName}`);
      
      const response = await this.r2Client.send(command);
      const templateBuffer = await this.streamToBuffer(response.Body);
      console.log(`Template fetched from R2: ${templateName} (${templateBuffer.length} bytes)`);
      return templateBuffer;
    } catch (error) {
      console.error(`Error fetching template ${templateName} from R2:`, error);
      
      // Try with different path formats if the direct path failed
      try {
        // First try with a templates/ prefix
        console.log(`Retrying with templates/${templateName}...`);
        const alternateCommand = new GetObjectCommand({
          Bucket: 'barbaby-contracts',
          Key: `templates/${templateName}`,
        });
        
        const alternateResponse = await this.r2Client.send(alternateCommand);
        const alternateBuffer = await this.streamToBuffer(alternateResponse.Body);
        console.log(`Template fetched from alternate path: templates/${templateName} (${alternateBuffer.length} bytes)`);
        return alternateBuffer;
      } catch (alternateError) {
        console.error(`Error fetching from templates/ path:`, alternateError);
        // Try one more path variation
        try {
          console.log(`Retrying with completed-forms/${templateName}...`);
          const secondAlternateCommand = new GetObjectCommand({
            Bucket: 'barbaby-contracts',
            Key: `completed-forms/${templateName}`,
          });
            
          const secondAlternateResponse = await this.r2Client.send(secondAlternateCommand);
          const secondAlternateBuffer = await this.streamToBuffer(secondAlternateResponse.Body);
          console.log(`Template fetched from second alternate path: completed-forms/${templateName} (${secondAlternateBuffer.length} bytes)`);
          return secondAlternateBuffer;
        } catch (secondAlternateError) {
          console.error(`Error fetching from completed-forms/ path:`, secondAlternateError);
          throw new Error(`Failed to fetch template (tried all paths): ${error.message}`);
        }
      }
    }
  }

  /**
   * Fill PDF form with client data
   */
  async fillPdfForm(templateBuffer, clientData) {
    try {
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(templateBuffer);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      console.log(`Found ${fields.length} form fields in PDF`);
      
      // Fill all available fields that match client data
      fields.forEach(field => {
        // Skip if not a text field
        if (field.constructor.name !== 'PDFTextField') return;
        
        const fieldName = field.getName();
        // Check if we have matching data using the exact camelCase field name
        if (clientData[fieldName] !== undefined) {
          try {
            field.setText(clientData[fieldName].toString());
            console.log(`Field '${fieldName}' set to "${clientData[fieldName]}"`);
          } catch (error) {
            console.warn(`Error setting field '${fieldName}':`, error.message);
          }
        }
      });
      
      // Flatten form to make it non-editable
      form.flatten();
      
      // Save filled PDF
      return await pdfDoc.save();
    } catch (error) {
      console.error('Error filling PDF form:', error);
      throw new Error(`Failed to fill PDF form: ${error.message}`);
    }
  }

  /**
   * Save filled PDF to R2 storage and send email notifications
   */
  async savePdfToR2(pdfBytes, formType, clientData) {
    try {
      const timestamp = Date.now();
      const clientName = `${clientData.firstName || ''}-${clientData.lastName || ''}`.trim().replace(/\s+/g, '-').toLowerCase();
      const key = `completed-forms/${clientName}_${timestamp}.pdf`;
      
      // Save local copy for debugging
      if (process.env.NODE_ENV === 'development') {
        try {
          const debugDir = './debug-pdfs';
          if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
          }
          const localPath = path.join(debugDir, `${formType}_${clientName}_${timestamp}.pdf`);
          fs.writeFileSync(localPath, Buffer.from(pdfBytes));
          console.log(`Debug copy saved locally at: ${localPath}`);
        } catch (fsError) {
          console.warn('Could not save local debug copy:', fsError.message);
        }
      }
      
      const params = {
        Bucket: 'barbaby-contracts',
        Key: key,
        Body: Buffer.from(pdfBytes),
        ContentType: 'application/pdf',
        Metadata: {
          clientName: `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim(),
          clientEmail: clientData.email || '',
          formType: formType,
          timestamp: timestamp.toString()
        }
      };
      
      await this.r2Client.send(new PutObjectCommand(params));
      const publicUrl = `https://pub-a73c1de02759402f8f74a8b93a6f48ea.r2.dev/${key}`;

      return {
        success: true,
        url: publicUrl,
        key: key,
        localPath: process.env.NODE_ENV === 'development' ? `./debug-pdfs/${formType}_${clientName}_${timestamp}.pdf` : null
      };
    } catch (error) {
      console.error('Error saving PDF to R2:', error);
      throw error;
    }
  }

  /**
   * Process all forms after successful payment
   */
  async emailCompletedForm(pdfBytes, formType, clientData) {
    if (!this.resend) {
      console.warn('Resend not configured, skipping email sending');
      return { success: false, error: 'Resend not configured' };
    }
    
    try {
      // User-friendly form names for emails
      const formTypeNames = {
        'registration': 'Registration Form',
        'agreement': 'Personal Training Agreement',
        'waiver': 'Liability Waiver'
      };
      
      const formName = formTypeNames[formType] || 'Form';
      const clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
      const clientEmail = clientData.email;
      
      if (!clientEmail) {
        return { success: false, error: 'Client email not provided' };
      }
      
      // Email to client
      const clientEmailResult = await this.resend.emails.send({
        from: 'BarBaby Fitness <signed-contracts@contracts.barbabyfitness.com>',
        to: [clientEmail],
        subject: `Your BarBaby Fitness Contract Confirmation`,
        html: `
          <h2>Welcome to BarBaby Fitness!</h2>
          <p>Dear ${clientName},</p>
          <p>Thank you for completing your BarBaby Fitness contracts. Please find all your completed forms attached.</p>
          <h3>Next Steps:</h3>
          <ul>
            <li>Lige will contact you within 24 hours to welcome you and answer any questions</li>
            <li>Review your welcome packet</li>
            <li>Follow us on social media for updates and tips</li>
          </ul>
          <p>Best regards,<br>BarBaby Fitness Team</p>
        `,
        attachments: [
          {
            filename: `${formType.replace(/_/g, '-')}.pdf`,
            content: Buffer.from(pdfBytes)
          }
        ]
      });
      
      // Email to business owner (adm.barbabyfitness@gmail.com)
      const ownerEmailResult = await this.resend.emails.send({
        from: 'BarBaby Fitness Contracts <signed-contracts@contracts.barbabyfitness.com>',
        to: ['adm.barbabyfitness@gmail.com'],
        replyTo: 'adm.barbabyfitness@gmail.com',
        subject: `New Contract Signed: ${clientName}`,
        html: `
          <h2>New Contract Submission</h2>
          <p>A new client has submitted their contracts:</p>
          <ul>
            <li>Name: ${clientName}</li>
            <li>Email: ${clientEmail}</li>
            <li>Signing Time: ${new Date().toLocaleString()}</li>
          </ul>
          <p>Please find all completed forms attached.</p>
        `,
        attachments: [
          {
            filename: `${clientName.replace(/\s+/g, '-').toLowerCase()}_${formType.replace(/_/g, '-')}.pdf`,
            content: Buffer.from(pdfBytes)
          }
        ]
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error sending emails:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a client form submission - the main entry point
   */
  async processForm(formType, clientData, options = {}) {
    try {
      // Validate form type
      if (!this.pdfForms[formType]) {
        throw new Error(`Unknown form type: ${formType}`);
      }
      
      const templateName = this.pdfForms[formType];
      console.log(`Processing ${formType} form for ${clientData.firstName || 'Unknown'} ${clientData.lastName || 'User'}`);
      
      // 1. Get template
      let templateBuffer;
      try {
        templateBuffer = await this.getTemplate(templateName);
      } catch (templateError) {
        console.error(`Error getting template ${templateName}:`, templateError);
        
        // If this is running in development, try to create a dummy PDF for testing
        if (process.env.NODE_ENV === 'development' && options.saveLocally) {
          console.log('Creating dummy PDF for testing in dev mode...');
          const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
          
          // Create a dummy PDF
          const dummyPdf = await PDFDocument.create();
          const page = dummyPdf.addPage();
          const font = await dummyPdf.embedFont(StandardFonts.Helvetica);
          
          page.drawText(`TEST PDF FOR ${formType.toUpperCase()}`, {
            x: 50,
            y: page.getHeight() - 50,
            size: 24,
            font,
            color: rgb(0, 0, 0),
          });
          
          page.drawText(`Client: ${clientData.firstName || ''} ${clientData.lastName || ''}`, {
            x: 50,
            y: page.getHeight() - 100,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
          
          // Save dummy PDF
          const dummyPdfBytes = await dummyPdf.save();
          
          // Save it locally
          const debugDir = options.debugDir || './debug-pdfs';
          const fs = await import('fs');
          const path = await import('path');
          
          if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
          }
          
          const localPath = path.join(
            debugDir, 
            `dummy_${formType}_${Date.now()}.pdf`
          );
          
          fs.writeFileSync(localPath, Buffer.from(dummyPdfBytes));
          console.log(`Dummy PDF saved at: ${localPath}`);
          
          return {
            success: true,
            formType: formType,
            pdfUrl: `file://${localPath}`,
            localPath: localPath,
            isDummy: true,
            error: templateError.message
          };
        }
        
        throw templateError;
      }
      
      // 2. Fill the form
      const filledPdfBytes = await this.fillPdfForm(templateBuffer, clientData);
      
      // 3. Save to R2
      const saveResult = await this.savePdfToR2(filledPdfBytes, formType, clientData);
      
      // 4. Email if requested and configured
      let emailResult = { success: false, reason: 'Email not requested' };
      if (options.sendEmail) {
        try {
          emailResult = await this.emailCompletedForm(filledPdfBytes, formType, clientData);
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          emailResult = { success: false, error: emailError.message };
        }
      }
      
      // 5. Save locally if requested (for debugging)
      if (options.saveLocally && !saveResult.localPath) {
        try {
          const debugDir = options.debugDir || './debug-pdfs';
          const fs = await import('fs');
          const path = await import('path');
          
          if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
          }
          
          const localPath = path.join(
            debugDir, 
            `${formType}_${clientData.firstName || ''}_${clientData.lastName || ''}_${Date.now()}.pdf`
          );
          fs.writeFileSync(localPath, Buffer.from(filledPdfBytes));
          console.log(`Debug copy saved locally at: ${localPath}`);
          saveResult.localPath = localPath;
        } catch (fsError) {
          console.warn('Could not save local debug copy:', fsError.message);
        }
      }
      
      return {
        success: true,
        formType: formType,
        pdfUrl: saveResult.url,
        pdfKey: saveResult.key,
        localPath: saveResult.localPath,
        emailed: emailResult.success,
        emailError: emailResult.error
      };
    } catch (error) {
      console.error(`Error processing ${formType} form:`, error);
      return {
        success: false,
        formType: formType,
        error: error.message
      };
    }
  }

  /**
   * Process multiple forms and send a single email with all URLs
   */
  async processMultipleForms(clientData, formTypes) {
    const results = [];
    const pdfUrls = [];

    for (const formType of formTypes) {
      try {
        const result = await this.processForm(formType, clientData);
        if (result.success) {
          results.push(result);
          pdfUrls.push(result.url);
        }
      } catch (error) {
        console.error(`Error processing ${formType} form:`, error);
        results.push({ success: false, formType, error: error.message });
      }
    }

    // Send a single email with all PDF URLs
    if (pdfUrls.length > 0) {
      try {
        await emailNotifier.sendContractNotification(clientData, pdfUrls);
        console.log('Email notifications sent successfully for all forms');
      } catch (emailError) {
        console.error('Error sending email notifications:', emailError);
      }
    }

    return {
      success: results.some(r => r.success),
      results,
      pdfUrls
    };
  }
  
  /**
   * Configure email transport for sending completed forms
   */
  setEmailTransport(config) {
    this.resend = new Resend(config.apiKey);
  }

  /**
   * Process all forms after successful payment
   */
  async processFormsAfterPayment(clientData) {
    try {
      const results = [];
      const filledForms = [];

      // Process each form
      for (const [formType, templatePath] of Object.entries(this.pdfForms)) {
        // Get template
        const templateBuffer = await this.getTemplate(templatePath);
        
        // Fill form
        const filledPdfBytes = await this.fillPdfForm(templateBuffer, clientData);
        
        // Save to R2
        const saveResult = await this.savePdfToR2(filledPdfBytes, formType, clientData);
        
        if (saveResult.success) {
          results.push(saveResult);
          filledForms.push({
            type: formType,
            url: saveResult.url,
            buffer: filledPdfBytes
          });
        }
      }

      // Send emails with all forms
      if (filledForms.length > 0) {
        await this.sendEmailsWithForms(clientData, filledForms);
      }

      return {
        success: true,
        results,
        filledForms
      };
    } catch (error) {
      console.error('Error processing forms after payment:', error);
      throw error;
    }
  }

  /**
   * Send emails to both client and owner with all completed forms
   */
  async sendEmailsWithForms(clientData, filledForms) {
    try {
      const { firstName, lastName, email } = clientData;
      const clientName = `${firstName} ${lastName}`;

      // Prepare email content
      const formNames = {
        registration: 'Registration Form',
        agreement: 'Training Agreement',
        waiver: 'Liability Waiver'
      };

      console.log('Attempting to send email to client:', email);
      
      // Email to client
      const clientEmailResult = await this.resend.emails.send({
        from: 'BarBaby Fitness <signed-contracts@contracts.barbabyfitness.com>',
        to: [email],
        subject: 'Your BarBaby Fitness Contract Confirmation',
        html: `
          <h2>Welcome to BarBaby Fitness!</h2>
          <p>Dear ${clientName},</p>
          <p>Thank you for completing your BarBaby Fitness contracts. Please find all your completed forms attached.</p>
          <h3>Next Steps:</h3>
          <ul>
            <li>Lige will contact you within 24 hours to welcome you and answer any questions</li>
            <li>Review your welcome packet</li>
            <li>Follow us on social media for updates and tips</li>
          </ul>
          <p>Best regards,<br>BarBaby Fitness Team</p>
        `,
        attachments: filledForms.map(form => ({
          filename: `${formNames[form.type]}.pdf`,
          content: form.buffer
        }))
      });

      console.log('Client email sent successfully:', clientEmailResult.id);

      // Email to owner
      console.log('Attempting to send email to owner: adm.barbabyfitness@gmail.com');
      
      const ownerEmailResult = await this.resend.emails.send({
        from: 'BarBaby Fitness Contracts <signed-contracts@contracts.barbabyfitness.com>',
        to: ['adm.barbabyfitness@gmail.com'],
        replyTo: 'adm.barbabyfitness@gmail.com',
        subject: `New Contract Signed: ${clientName}`,
        html: `
          <h2>New Contract Submission</h2>
          <p>A new client has submitted their contracts:</p>
          <ul>
            <li>Name: ${clientName}</li>
            <li>Email: ${email}</li>
            <li>Signing Time: ${new Date().toLocaleString()}</li>
          </ul>
          <p>Please find all completed forms attached.</p>
        `,
        attachments: filledForms.map(form => ({
          filename: `${clientName}_${formNames[form.type]}.pdf`,
          content: form.buffer
        }))
      });

      console.log('Owner email sent successfully:', ownerEmailResult.id);
      
      return true;
    } catch (error) {
      console.error('Error sending emails:', error);
      throw error;
    }
  }
}

// Export singleton instance for easy use
export const pdfManager = new PDFManager();

// Export class for custom initialization
export default PDFManager;
