import nodemailer from 'nodemailer';

class EmailNotifier {
  constructor() {
    // Use Gmail's OAuth2 or direct SMTP with the existing account
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'adm.barbabyfitness@gmail.com',
        // No password needed - will use Gmail's built-in authentication
      }
    });
  }

  async sendContractNotification(clientData, pdfUrls) {
    const { firstName, lastName, email } = clientData;
    const clientName = `${firstName} ${lastName}`;

    // Email to client
    await this.transporter.sendMail({
      from: 'adm.barbabyfitness@gmail.com',
      to: email,
      subject: 'Your BarBaby Fitness Contracts',
      html: `
        <h2>Thank you for completing your BarBaby Fitness contracts!</h2>
        <p>Dear ${clientName},</p>
        <p>Your contracts have been successfully processed and stored. You can access them at the following links:</p>
        <ul>
          ${pdfUrls.map(url => `<li><a href="${url}">${this.getDocumentName(url)}</a></li>`).join('')}
        </ul>
        <p>Please save these links for your records.</p>
        <p>Best regards,<br>BarBaby Fitness Team</p>
      `,
    });

    // Email to business
    await this.transporter.sendMail({
      from: 'adm.barbabyfitness@gmail.com',
      to: 'adm.barbabyfitness@gmail.com',
      subject: `New Contract Submission - ${clientName}`,
      html: `
        <h2>New Contract Submission</h2>
        <p>A new client has submitted their contracts:</p>
        <ul>
          <li>Name: ${clientName}</li>
          <li>Email: ${email}</li>
        </ul>
        <p>Contract Links:</p>
        <ul>
          ${pdfUrls.map(url => `<li><a href="${url}">${this.getDocumentName(url)}</a></li>`).join('')}
        </ul>
      `,
    });
  }

  getDocumentName(url) {
    if (url.includes('registration')) return 'Registration Form';
    if (url.includes('training')) return 'Training Agreement';
    if (url.includes('liability')) return 'Liability Waiver';
    return 'Contract Document';
  }
}

export const emailNotifier = new EmailNotifier(); 