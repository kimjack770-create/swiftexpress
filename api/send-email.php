<?php
/**
 * Swift Express Logistics - Email Handler
 * Handles contact form submissions and sends emails via cPanel SMTP
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// ── CONFIGURATION ────────────────────────────────────────────
$SUPPORT_EMAIL  = 'support@swiftexpresslogix.com';
$SUPPORT_NAME   = 'Swift Express Logistics Support';
$FROM_EMAIL     = 'support@swiftexpresslogix.com'; // Must match a valid cPanel email
$SMTP_HOST      = 'lim112.truehost.cloud';
$SMTP_PORT      = 587;
// ─────────────────────────────────────────────────────────────

// Parse JSON body
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

// Fallback to $_POST for form-encoded submissions
if (!$data) {
    $data = $_POST;
}

// Validate required fields
$name    = trim($data['name']    ?? '');
$email   = trim($data['email']   ?? '');
$phone   = trim($data['phone']   ?? '');
$subject = trim($data['subject'] ?? '');
$message = trim($data['message'] ?? '');

if (empty($name) || empty($email) || empty($subject) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    exit();
}

// Sanitize inputs to prevent header injection
$name    = strip_tags($name);
$email   = filter_var($email, FILTER_SANITIZE_EMAIL);
$phone   = strip_tags($phone);
$subject = strip_tags($subject);
$message = strip_tags($message);

// ── BUILD EMAIL ───────────────────────────────────────────────
$emailSubject = "📦 New Contact: " . $subject;

$emailBody = "
<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
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
  <div class='container'>
    <div class='header'>
      <h1>📨 New Contact Form Submission</h1>
      <p>Swift Express Logistics — Customer Inquiry</p>
    </div>
    <div class='body'>
      <div class='field'>
        <div class='label'>From</div>
        <div class='value'>{$name}</div>
      </div>
      <div class='field'>
        <div class='label'>Email Address</div>
        <div class='value'><a href='mailto:{$email}' style='color:#0A2F6D;'>{$email}</a></div>
      </div>
      <div class='field'>
        <div class='label'>Phone</div>
        <div class='value'>" . ($phone ?: 'Not provided') . "</div>
      </div>
      <div class='field'>
        <div class='label'>Subject</div>
        <div class='value'><span class='badge'>{$subject}</span></div>
      </div>
      <div class='field'>
        <div class='label'>Message</div>
        <div class='message-box'>" . nl2br(htmlspecialchars($message)) . "</div>
      </div>
    </div>
    <div class='footer'>
      This message was sent via the contact form on swiftexpresslogix.com<br>
      Received: " . date('F j, Y \a\t g:i A T') . "
    </div>
  </div>
</body>
</html>
";

// ── AUTO-REPLY to customer ─────────────────────────────────────
$autoReplyBody = "
<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f7ff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0A2F6D, #002D62); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { padding: 30px; line-height: 1.7; color: #333; }
    .highlight { background: #f4f7ff; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .btn { display: inline-block; background: #0A2F6D; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <h1>✅ We Got Your Message!</h1>
    </div>
    <div class='body'>
      <p>Dear <strong>{$name}</strong>,</p>
      <p>Thank you for reaching out to <strong>Swift Express Logistics</strong>. We have received your inquiry and a member of our team will respond within <strong>15 minutes</strong>.</p>
      <div class='highlight'>
        <strong>Your inquiry summary:</strong><br>
        Subject: <em>{$subject}</em><br>
        Reference ID: <em>MSG-" . strtoupper(substr(md5($name . time()), 0, 8)) . "</em>
      </div>
      <p>If your matter is urgent, please call us directly at <strong>+1 (775) 757-0577</strong>.</p>
      <p>Best regards,<br><strong>Swift Express Logistics Support Team</strong></p>
    </div>
    <div class='footer'>
      Swift Express Logistics | support@swiftexpresslogix.com | swiftexpresslogix.com
    </div>
  </div>
</body>
</html>
";

// ── SEND EMAILS using PHP mail() ──────────────────────────────
// cPanel servers support PHP mail() which routes through the local MTA (Exim)
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: {$SUPPORT_NAME} <{$FROM_EMAIL}>\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "X-Mailer: SwiftExpressMailer/1.0\r\n";

// Send notification to support team
$sentToSupport = mail($SUPPORT_EMAIL, $emailSubject, $emailBody, $headers);

// Send auto-reply to customer
$autoReplyHeaders  = "MIME-Version: 1.0\r\n";
$autoReplyHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
$autoReplyHeaders .= "From: {$SUPPORT_NAME} <{$FROM_EMAIL}>\r\n";
$autoReplyHeaders .= "Reply-To: {$FROM_EMAIL}\r\n";
$autoReplyHeaders .= "X-Mailer: SwiftExpressMailer/1.0\r\n";

$sentAutoReply = mail($email, "We received your message — Swift Express Logistics", $autoReplyBody, $autoReplyHeaders);

// ── RESPONSE ──────────────────────────────────────────────────
if ($sentToSupport) {
    echo json_encode([
        'success'    => true,
        'message'    => 'Your message has been sent successfully! We\'ll respond within 15 minutes.',
        'auto_reply' => $sentAutoReply
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to send email. Please try again or contact us directly at support@swiftexpresslogix.com'
    ]);
}
?>
