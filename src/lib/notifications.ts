import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface EmailOptions {
  toEmail: string;
  toPhone?: string | null;
  subject: string;
  headline: string;
  bodyHtml: string;
  actionButton?: {
    label: string;
    url: string;
  };
}

export interface InAppNotificationOptions {
  userId?: string | null; // null broadcasts to all admins
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'urgent';
  link?: string;
}

/**
 * Base email layout with DAYDAY branding
 */
async function buildBrandedEmailHtml(options: {
  headline: string;
  bodyHtml: string;
  actionButton?: { label: string; url: string };
}): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { data: settings } = await createAdminClient()
    .from('company_settings')
    .select('company_name, tagline')
    .maybeSingle();
  const companyName = settings?.company_name || '';
  const tagline = settings?.tagline || '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px 0; -webkit-text-size-adjust: 100%; }
    .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 12px; color: #dbeafe; font-style: italic; }
    .content { padding: 32px 28px; }
    .headline { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px; }
    .body-text { font-size: 14px; line-height: 1.6; color: #334155; }
    .card-box { background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #2563eb; }
    .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .btn-container { text-align: center; margin: 28px 0 12px; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 28px; border-radius: 10px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${companyName}</h1>
      <p>“${tagline}”</p>
    </div>
    <div class="content">
      <h2 class="headline">${options.headline}</h2>
      <div class="body-text">
        ${options.bodyHtml}
      </div>
      ${
        options.actionButton
          ? `<div class="btn-container">
              <a href="${options.actionButton.url}" class="btn" target="_blank">${options.actionButton.label} &rarr;</a>
             </div>`
          : ''
      }
    </div>
    <div class="footer">
      <p>Spintex Road, Flowerpot, Accra, Ghana • Tel: +233 24 555 8899</p>
      <p style="margin-top: 4px;">Thank you for trusting ${companyName}.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Dispatch an email via configured provider (Resend / console fallback)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { data: settings } = await createAdminClient()
    .from('company_settings')
    .select('company_name, email')
    .maybeSingle();
  const companyName = settings?.company_name || '';
  const html = await buildBrandedEmailHtml({
    headline: options.headline,
    bodyHtml: options.bodyHtml,
    actionButton: options.actionButton,
  });

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || `${companyName} <${settings?.email || 'noreply@example.com'}>`;

  console.log(`[EMAIL DISPATCH] To: ${options.toEmail} | Subject: "${options.subject}"`);

  // Optional SMS via Arkesel if phone number and key are available
  if (options.toPhone && process.env.ARKESEL_SMS_API_KEY) {
    try {
      const cleanPhone = options.toPhone.replace(/[^0-9]/g, '');
      const smsMessage = `${options.headline}. ${options.actionButton ? `Link: ${options.actionButton.url}` : ''}`;
      await fetch('https://sms.arkesel.com/api/v2/sms/send', {
        method: 'POST',
        headers: { 'api-key': process.env.ARKESEL_SMS_API_KEY },
        body: JSON.stringify({
          sender: companyName,
          recipients: [cleanPhone],
          message: smsMessage,
        }),
      }).catch((e) => console.warn('[SMS ERROR]', e));
    } catch (smsErr) {
      console.warn('[ARKESEL SMS WARNING]', smsErr);
    }
  }

  // 1. If Resend API key is present
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [options.toEmail],
          subject: options.subject,
          html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[RESEND API ERROR] ${errText}`);
        return false;
      }
      return true;
    } catch (resendError) {
      console.error('[RESEND DISPATCH ERROR]', resendError);
      return false;
    }
  }

  // Fallback: logged for inspection
  return true;
}

/**
 * Dispatch an In-App notification stored in the Supabase database
 */
export async function createInAppNotification(options: InAppNotificationOptions) {
  try {
    const adminClient = createAdminClient();
    await adminClient.from('notifications').insert({
      user_id: options.userId || null, // null means broadcast to all admins
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      link: options.link || null,
      is_read: false,
    });
  } catch (err) {
    console.error('[IN-APP NOTIFICATION ERROR]', err);
  }
}

// ============================================================================
// DOMAIN-SPECIFIC NOTIFICATIONS REQUIRED BY USER
// ============================================================================

/**
 * 1. Notification: Booking Approved
 * "User gets should get a notification , perferably email when their booking has been approved to go and make payment"
 */
export async function notifyBookingApproved(booking: {
  id: string;
  booking_ref: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  preferred_date: string;
  service_address: string;
  quoted_price: number | string;
  service?: { name: string } | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const paymentLink = `${appUrl}/track-booking?ref=${encodeURIComponent(booking.booking_ref)}`;
  const serviceName = booking.service?.name || 'Professional Cleaning Service';
  const amountStr = formatCurrency(Number(booking.quoted_price));

  // 1. Send Email to Customer
  if (booking.customer_email) {
    await sendEmail({
      toEmail: booking.customer_email,
      toPhone: booking.customer_phone,
      subject: `Booking Approved: ${booking.booking_ref} - Please Proceed to Payment`,
      headline: `Your Cleaning Booking is Approved! 🎉`,
      bodyHtml: `
        <p>Dear <strong>${booking.customer_name}</strong>,</p>
        <p>Great news! Your booking request <strong>${booking.booking_ref}</strong> for <strong>${serviceName}</strong> has been officially approved by our operations team.</p>
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:16px; margin:20px 0;">
          <p style="margin:4px 0;">📅 <strong>Scheduled Date:</strong> ${formatDate(booking.preferred_date)}</p>
          <p style="margin:4px 0;">📍 <strong>Location:</strong> ${booking.service_address}</p>
          <p style="margin:4px 0;">💰 <strong>Agreed Amount:</strong> <strong style="color:#2563eb;">${amountStr}</strong></p>
        </div>
        <p>To lock in your time slot and confirm cleaner crew dispatch, please click below to complete your payment via Mobile Money, Paystack, or Bank Transfer.</p>
      `,
      actionButton: {
        label: 'Pay Now & Confirm Schedule',
        url: paymentLink,
      },
    });
  }

  // 2. In-App Notification for Admin
  await createInAppNotification({
    title: `Booking Approved: ${booking.booking_ref}`,
    message: `Booking for ${booking.customer_name} (${serviceName}) approved. Awaiting payment of ${amountStr}.`,
    type: 'success',
    link: `/bookings`,
  });
}

/**
 * Notification: Booking Rejected
 * "User gets should get a notification , perferably email when their booking has been rejected"
 */
export async function notifyBookingRejected(booking: {
  id: string;
  booking_ref: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  preferred_date: string;
  service?: { name: string } | null;
}) {
  const serviceName = booking.service?.name || 'Professional Cleaning Service';

  if (booking.customer_email) {
    await sendEmail({
      toEmail: booking.customer_email,
      toPhone: booking.customer_phone,
      subject: `Update on Booking Request: ${booking.booking_ref}`,
      headline: `Booking Request Status Update`,
      bodyHtml: `
        <p>Dear <strong>${booking.customer_name}</strong>,</p>
        <p>Thank you for reaching out to our cleaning service for your <strong>${serviceName}</strong> request.</p>
        <p>Regrettably, we are unable to accommodate your requested schedule for <strong>${formatDate(booking.preferred_date)}</strong> due to fully booked cleaner routes in your area.</p>
        <p>If you would like to select an alternative date or time slot, please reply directly to this email or call our direct customer service line at <strong>+233 24 555 8899</strong>.</p>
      `,
    });
  }
}

/**
 * 2. Notification: Payment Received (Customer + Admin Alert)
 * "User receives a notification /email when payment is made. Admin also get a notification of the alert"
 */
export async function notifyPaymentReceived(params: {
  paymentRef: string;
  amount: number | string;
  paymentMethod: string;
  referenceNumber?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  invoiceNumber?: string | null;
  invoiceId?: string | null;
  balanceDue?: number | string | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const formattedAmount = formatCurrency(Number(params.amount));
  const remainingBalance = params.balanceDue !== null && params.balanceDue !== undefined
    ? formatCurrency(Number(params.balanceDue))
    : null;

  // 1. Email to Customer
  if (params.customerEmail) {
    await sendEmail({
      toEmail: params.customerEmail,
      toPhone: params.customerPhone,
      subject: `Payment Receipt: ${params.paymentRef} (${formattedAmount})`,
      headline: `Payment Received! Thank You 🙏`,
      bodyHtml: `
        <p>Dear <strong>${params.customerName}</strong>,</p>
        <p>We have successfully received your payment of <strong>${formattedAmount}</strong>.</p>
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:16px; margin:20px 0;">
          <p style="margin:4px 0;">🧾 <strong>Receipt Ref:</strong> ${params.paymentRef}</p>
          <p style="margin:4px 0;">💳 <strong>Method:</strong> ${params.paymentMethod.toUpperCase()}</p>
          ${params.referenceNumber ? `<p style="margin:4px 0;">🔢 <strong>Transaction Code:</strong> ${params.referenceNumber}</p>` : ''}
          ${params.invoiceNumber ? `<p style="margin:4px 0;">📄 <strong>Invoice #:</strong> ${params.invoiceNumber}</p>` : ''}
          ${remainingBalance ? `<p style="margin:4px 0;">⚖️ <strong>Remaining Balance Due:</strong> <strong style="color:${Number(params.balanceDue) > 0 ? '#dc2626' : '#16a34a'};">${remainingBalance}</strong></p>` : ''}
        </div>
        <p>Our team is fully dispatched according to your schedule.</p>
      `,
      actionButton: params.invoiceId
        ? {
            label: 'View Your Invoice & Receipt',
            url: `${appUrl}/invoices/${params.invoiceId}`,
          }
        : undefined,
    });
  }

  // 2. Alert to Admin (In-App Header Notification)
  await createInAppNotification({
    title: `Payment Received: ${formattedAmount}`,
    message: `Received ${formattedAmount} from ${params.customerName} via ${params.paymentMethod.toUpperCase()} (Ref: ${params.paymentRef}).`,
    type: 'success',
    link: params.invoiceId ? `/invoices/${params.invoiceId}` : `/payments`,
  });

  // 3. Email Alert to Admin Email
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'billing@daydaysparkle.com';
  await sendEmail({
    toEmail: adminEmail,
    subject: `🔔 Admin Alert: Payment Received - ${formattedAmount} from ${params.customerName}`,
    headline: `New Payment Received`,
    bodyHtml: `
      <p>A customer payment has been recorded and verified.</p>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin:16px 0;">
        <p style="margin:4px 0;">👤 <strong>Customer:</strong> ${params.customerName} (${params.customerPhone || 'No phone'})</p>
        <p style="margin:4px 0;">💰 <strong>Amount:</strong> <strong style="color:#059669;">${formattedAmount}</strong></p>
        <p style="margin:4px 0;">💳 <strong>Method:</strong> ${params.paymentMethod.toUpperCase()}</p>
        <p style="margin:4px 0;">🧾 <strong>Receipt:</strong> ${params.paymentRef}</p>
        ${params.referenceNumber ? `<p style="margin:4px 0;">🔢 <strong>Reference:</strong> ${params.referenceNumber}</p>` : ''}
      </div>
    `,
    actionButton: params.invoiceId
      ? {
          label: 'Open Invoice in Admin Dashboard',
          url: `${appUrl}/invoices/${params.invoiceId}`,
        }
      : undefined,
  });
}

/**
 * 3. Notification: Job Scheduled
 * "User should be able be notified when job is scheduled"
 */
export async function notifyJobScheduled(params: {
  jobNumber: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  location: string;
  crewCount?: number;
}) {
  if (params.clientEmail) {
    await sendEmail({
      toEmail: params.clientEmail,
      toPhone: params.clientPhone,
      subject: `Cleaning Job Scheduled: ${params.jobNumber}`,
      headline: `Your Cleaning Job Has Been Scheduled! 📅`,
      bodyHtml: `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>Your cleaning assignment <strong>${params.jobNumber}</strong> has been officially scheduled.</p>
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:16px; margin:20px 0;">
          <p style="margin:4px 0;">✨ <strong>Service:</strong> ${params.serviceName}</p>
          <p style="margin:4px 0;">📅 <strong>Date:</strong> ${formatDate(params.scheduledDate)}</p>
          <p style="margin:4px 0;">⏰ <strong>Arrival Time:</strong> ${params.scheduledStartTime}</p>
          <p style="margin:4px 0;">📍 <strong>Job Location:</strong> ${params.location}</p>
          ${params.crewCount ? `<p style="margin:4px 0;">👥 <strong>Assigned Crew:</strong> ${params.crewCount} Cleaner(s)</p>` : ''}
        </div>
        <p>Our cleaning specialists will arrive on time with all necessary equipment and materials.</p>
      `,
    });
  }
}

/**
 * 4. Notification: Job Completed
 * "User should be able be notified when job is completed"
 */
export async function notifyJobCompleted(params: {
  jobId: string;
  jobNumber: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  serviceName: string;
  location: string;
  completionNotes?: string | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // 1. Email to Customer
  if (params.clientEmail) {
    await sendEmail({
      toEmail: params.clientEmail,
      toPhone: params.clientPhone,
      subject: `Cleaning Completed: ${params.jobNumber}`,
      headline: `Your Cleaning Job is Complete! ✨`,
      bodyHtml: `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>We are pleased to inform you that cleaning crew operations for job <strong>${params.jobNumber}</strong> (${params.serviceName}) have been completed at <strong>${params.location}</strong>.</p>
        ${
          params.completionNotes
            ? `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin:16px 0;">
                <p style="margin:0; font-size:13px; color:#475569;"><strong>Field Crew Notes:</strong> ${params.completionNotes}</p>
               </div>`
            : ''
        }
        <p>Thank you for choosing our cleaning service.</p>
      `,
      actionButton: {
        label: 'View Job Details & Invoices',
        url: `${appUrl}/jobs/${params.jobId}`,
      },
    });
  }

  // 2. Alert to Admin (In-App)
  await createInAppNotification({
    title: `Job Completed: ${params.jobNumber}`,
    message: `Cleaning crew completed job ${params.jobNumber} for ${params.clientName} at ${params.location}.`,
    type: 'success',
    link: `/jobs/${params.jobId}`,
  });
}
