const nodemailer = require('nodemailer');

const SUPPORT_EMAIL = 'support@swiftexpresslogix.com';
const SUPPORT_NAME = 'Swift Express Logistics Support';
const FROM_EMAIL = process.env.SMTP_USER || SUPPORT_EMAIL;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'lim112.truehost.cloud',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function supportEmailHtml({ name, email, phone, subject, message }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f7ff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0A2F6D, #002D62); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 8px 0 0; opacity: 0.8; font-size: 14px; }
    .body { padding: 30px; }
    .field { margin-bottom: 18px; border-bottom: 1px solid #eee; padding-bottom: 14px; }
    .field:last-child { border-bottom: none; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; font-weight: 600; margin-bottom: 4px; }
    .value { font-size: 15px; color: #1a1a2e; font-weight: 500; }
    .message-box { background: #f4f7ff; border-left: 4px solid #0A2F6D; padding: 16px; border-radius: 4px; font-size: 14px; line-height: 1.6; color: #333; }
    .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #888; }
    .badge { display: inline-block; background: #e8f0fe; color: #0A2F6D; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Contact Form Submission</h1>
      <p>Swift Express Logistics — Customer Inquiry</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">From</div>
        <div class="value">${escapeHtml(name)}</div>
      </div>
      <div class="field">
        <div class="label">Email Address</div>
        <div class="value"><a href="mailto:${escapeHtml(email)}" style="color:#0A2F6D;">${escapeHtml(email)}</a></div>
      </div>
      <div class="field">
        <div class="label">Phone</div>
        <div class="value">${escapeHtml(phone || 'Not provided')}</div>
      </div>
      <div class="field">
        <div class="label">Subject</div>
        <div class="value"><span class="badge">${escapeHtml(subject)}</span></div>
      </div>
      <div class="field">
        <div class="label">Message</div>
        <div class="message-box">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
      </div>
    </div>
    <div class="footer">
      This message was sent via the contact form on swiftexpresslogix.com<br>
      Received: ${new Date().toUTCString()}
    </div>
  </div>
</body>
</html>`;
}

function autoReplyHtml({ name, subject }) {
  const refId = ('MSG-' + (name + Date.now()).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16)).toUpperCase();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f7ff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0A2F6D, #002D62); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { padding: 30px; line-height: 1.7; color: #333; }
    .highlight { background: #f4f7ff; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>We Got Your Message!</h1>
    </div>
    <div class="body">
      <p>Dear <strong>${escapeHtml(name)}</strong>,</p>
      <p>Thank you for reaching out to <strong>Swift Express Logistics</strong>. We have received your inquiry and a member of our team will respond within <strong>15 minutes</strong>.</p>
      <div class="highlight">
        <strong>Your inquiry summary:</strong><br>
        Subject: <em>${escapeHtml(subject)}</em><br>
        Reference ID: <em>${refId}</em>
      </div>
      <p>If your matter is urgent, please call us directly at <strong>+1 (775) 757-0577</strong>.</p>
      <p>Best regards,<br><strong>Swift Express Logistics Support Team</strong></p>
    </div>
    <div class="footer">
      Swift Express Logistics | support@swiftexpresslogix.com | swiftexpresslogix.com
    </div>
  </div>
</body>
</html>`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  const data = req.body && Object.keys(req.body).length ? req.body : {};

  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim();
  const subject = String(data.subject || '').trim();
  const message = String(data.message || '').trim();

  if (!name || !email || !subject || !message) {
    res.status(400).json({ success: false, message: 'Missing required fields' });
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    res.status(400).json({ success: false, message: 'Invalid email address' });
    return;
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('SMTP_USER / SMTP_PASS environment variables are not configured');
    res.status(500).json({ success: false, message: 'Email service is not configured' });
    return;
  }

  const fields = { name, email, phone, subject, message };
  const transporter = buildTransporter();

  let sentToSupport = false;
  let sentAutoReply = false;

  try {
    await transporter.sendMail({
      from: `${SUPPORT_NAME} <${FROM_EMAIL}>`,
      to: SUPPORT_EMAIL,
      replyTo: `${name} <${email}>`,
      subject: `New Contact: ${subject}`,
      html: supportEmailHtml(fields)
    });
    sentToSupport = true;
  } catch (err) {
    console.error('Failed to send support notification email:', err);
  }

  try {
    await transporter.sendMail({
      from: `${SUPPORT_NAME} <${FROM_EMAIL}>`,
      to: email,
      replyTo: FROM_EMAIL,
      subject: 'We received your message — Swift Express Logistics',
      html: autoReplyHtml(fields)
    });
    sentAutoReply = true;
  } catch (err) {
    console.error('Failed to send auto-reply email:', err);
  }

  if (sentToSupport) {
    res.status(200).json({
      success: true,
      message: "Your message has been sent successfully! We'll respond within 15 minutes.",
      auto_reply: sentAutoReply
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to send email. Please try again or contact us directly at support@swiftexpresslogix.com'
    });
  }
};
