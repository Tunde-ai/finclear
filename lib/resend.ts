import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL || "FinClear <notifications@finclear.app>";

export async function sendNotification({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
}

export async function notifyAccountantNote(accountantName: string, clientEmail: string, transactionName: string) {
  await sendNotification({
    to: clientEmail,
    subject: `${accountantName} added a note on "${transactionName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px;">
        <h2 style="color: #059669;">FinClear</h2>
        <p>Your accountant <strong>${accountantName}</strong> left a note on the transaction "<strong>${transactionName}</strong>".</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client/transactions" style="color: #059669;">View in FinClear</a></p>
      </div>
    `,
  });
}

export async function notifyDocumentUploaded(uploaderName: string, recipientEmail: string, docName: string) {
  await sendNotification({
    to: recipientEmail,
    subject: `New document uploaded: ${docName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px;">
        <h2 style="color: #059669;">FinClear</h2>
        <p><strong>${uploaderName}</strong> uploaded a new document: "<strong>${docName}</strong>".</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client/documents" style="color: #059669;">View Documents</a></p>
      </div>
    `,
  });
}

export async function notifyReportReady(recipientEmail: string, reportTitle: string) {
  await sendNotification({
    to: recipientEmail,
    subject: `Your report is ready: ${reportTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px;">
        <h2 style="color: #059669;">FinClear</h2>
        <p>Your AI-generated report "<strong>${reportTitle}</strong>" is ready.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client/reports" style="color: #059669;">View Report</a></p>
      </div>
    `,
  });
}

export async function notifyTaxDeadline(recipientEmail: string, deadline: string, description: string) {
  await sendNotification({
    to: recipientEmail,
    subject: `Tax Deadline Reminder: ${deadline}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px;">
        <h2 style="color: #059669;">FinClear</h2>
        <p><strong>Upcoming Tax Deadline: ${deadline}</strong></p>
        <p>${description}</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client" style="color: #059669;">Open FinClear</a></p>
      </div>
    `,
  });
}

// Hardcoded tax deadline dates
export const TAX_DEADLINES = [
  { date: "01-15", label: "Jan 15", description: "Q4 estimated tax payment due" },
  { date: "04-15", label: "Apr 15", description: "Annual tax return and Q1 estimated tax payment due" },
  { date: "06-15", label: "Jun 15", description: "Q2 estimated tax payment due" },
  { date: "09-15", label: "Sep 15", description: "Q3 estimated tax payment due" },
];
