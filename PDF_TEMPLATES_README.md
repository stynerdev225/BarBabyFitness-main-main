# BarBaby Fitness PDF Templates Solution

This README explains how the PDF form system works and how to maintain it.

## Overview

The application uses fillable PDF templates stored in Cloudflare R2 to generate personalized forms for users. The system:

1. Downloads template PDFs from R2
2. Fills them with user data collected from the website
3. Saves completed forms back to R2 in the appropriate folders

## Template Structure

The templates are stored in Cloudflare R2 in the `templates/` folder:

- `registration_form_template.pdf` - Registration form
- `training_agreement_template.pdf` - Training agreement
- `liability_waiver_template.pdf` - Liability waiver

## Creating Fillable Templates

The original templates did not have fillable form fields. We created a script to add form fields:

1. `scripts/create-fillable-templates.js` - Downloads templates from R2 and adds form fields
2. `scripts/upload-templates-to-r2.js` - Uploads the modified templates back to R2

### Form Fields in Each Template

Each template has specific form fields that can be programmatically filled:

**Registration Form Fields:**
- Personal info: firstName, lastName, email, phoneNo, dateOfBirth
- Gender selection: gender_male, gender_female, gender_other
- Address fields: streetAddress, streetAddressLine2, city, state, zipCode
- Health metrics: currentWeight, goalWeight, height, fitnessLevel
- Emergency contact: emergencyContactFirstName, emergencyContactLastName, etc.
- Medical information fields
- Signature fields

**Training Agreement Fields:**
- Personal info: firstName, lastName
- Address fields: streetAddress, city, state, zipCode
- Plan details: selectedPlanTitle, selectedPlanPrice, selectedPlanSessions, etc.
- Trainer & client info: trainerName, clientName
- Signature fields: trainerSignature, clientSignature, trainerDate, clientDate

**Liability Waiver Fields:**
- Personal info: firstName, lastName
- Address fields: streetAddress, city, state, zipCode
- participantName
- Signature fields: participantSignature, clientSignature, witnessName, etc.

## Usage Instructions

### Creating/Updating Templates

If you need to update the templates or create new ones:

1. Install dependencies:
```
npm install pdf-lib node-fetch
```

2. Run the template creation script:
```
npm run create-fillable-templates
```

3. Check the generated templates in the `fillable-templates/` folder

4. Install AWS SDK for uploading to R2:
```
npm install @aws-sdk/client-s3
```

5. Set up your R2 credentials as environment variables:
```
export R2_ACCESS_KEY_ID=your_access_key
export R2_SECRET_ACCESS_KEY=your_secret_key
export R2_ENDPOINT=https://xxxxxxxxxxxx.r2.cloudflarestorage.com
export R2_BUCKET_NAME=barbaby-contracts
```

6. Upload the templates to R2:
```
node scripts/upload-templates-to-r2.js
```

### Testing Templates

To test if templates have the correct form fields:

```
npm run test-templates
```

## Troubleshooting

**Problem**: Templates don't have form fields after downloading from R2
**Solution**: Make sure you've uploaded the fillable versions of the templates to R2

**Problem**: Data not appearing in the right places on the form
**Solution**: Adjust the field positions in the form field definitions in `create-fillable-templates.js` 