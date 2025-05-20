import { PDFManager } from '../src/utils/pdfUtils.js';

// Create a test instance of PDFManager
const pdfManager = new PDFManager();

// Sample client data
const testClientData = {
  firstName: 'Test',
  lastName: 'User',
  email: 'adm.barbabyfitness@gmail.com', // Using your email for testing
  phoneNo: '555-123-4567',
  streetAddress: '123 Test Street',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  selectedPlan: {
    title: 'Test Plan',
    price: '$100',
    sessions: '4 sessions',
    initiationFee: '$50'
  }
};

async function testEmailFlow() {
  try {
    console.log('Starting test email flow...');
    console.log('Processing forms with test data:', testClientData);

    // Process all forms and send emails
    const result = await pdfManager.processFormsAfterPayment(testClientData);
    
    if (result.success) {
      console.log('✅ Test successful!');
      console.log('Forms processed:', result.filledForms.map(f => f.type).join(', '));
      console.log('Check your email (adm.barbabyfitness@gmail.com) for the test emails');
    } else {
      console.error('❌ Test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Run the test
testEmailFlow(); 