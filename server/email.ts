import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { Draft, User } from "@shared/schema";

let transporter: Transporter | null = null;

/**
 * Initialize the email transporter using Gmail SMTP
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD environment variables
 */
function getTransporter(): Transporter {
  if (!transporter) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      console.warn("Gmail credentials not configured. Email notifications will be disabled.");
      // Return a dummy transporter that logs instead of sending
      return {
        sendMail: async (mailOptions: import("nodemailer").SendMailOptions) => {
          console.log("[EMAIL MOCK] Would send email:", mailOptions);
          return { messageId: "mock-" + Date.now() };
        },
      } as any;
    }

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });
  }

  return transporter;
}

/**
 * Send email notification when a new draft is submitted to approvers
 */
export async function sendDraftSubmissionEmail(
  draft: Draft,
  submitter: User,
  approvers: User[],
  attachments?: { filename: string; content?: any; path?: string }[]
) {
  const transporter = getTransporter();

  const approverEmails = approvers.map((a) => a.email).join(", ");

  // Generate a safe subject line
  const subject = `New Draft Submitted for Approval: ${draft.title}`;

  const htmlContent = `
    <h2>New Draft Submission Notification</h2>
    <p>A new draft has been submitted for your review.</p>
    <hr/>
    <p><strong>Draft Title:</strong> ${escapeHtml(draft.title)}</p>
    <p><strong>Type:</strong> ${escapeHtml(draft.type)}</p>
    <p><strong>Submitted By:</strong> ${escapeHtml(submitter.name)} (${escapeHtml(submitter.email)})</p>
    <p><strong>Department:</strong> ${escapeHtml(submitter.department)}</p>
    <p><strong>Submitted At:</strong> ${new Date(draft.createdAt!).toLocaleString()}</p>
    <hr/>
    <p>Please log in to the Draft Approval Hub to review and provide feedback.</p>
  `;

  return await transporter.sendMail({
    from: process.env.GMAIL_USER!,
    to: approverEmails,
    subject,
    html: htmlContent,
    attachments: attachments || [],
  });
}

/**
 * Send email notification when draft status changes
 */
export async function sendDraftStatusChangeEmail(
  draft: Draft,
  updatedBy: User,
  submitterEmail: string,
  statusChangeDetails?: string
) {
  const transporter = getTransporter();

  const subject = `Draft "${draft.title}" Status Changed to ${draft.status}`;

  const htmlContent = `
    <h2>Draft Status Update</h2>
    <p>Your draft has been updated.</p>
    <hr/>
    <p><strong>Draft Title:</strong> ${escapeHtml(draft.title)}</p>
    <p><strong>New Status:</strong> <strong>${escapeHtml(draft.status)}</strong></p>
    <p><strong>Updated By:</strong> ${escapeHtml(updatedBy.name)} (${escapeHtml(updatedBy.email)})</p>
    <p><strong>Department:</strong> ${escapeHtml(updatedBy.department)}</p>
    <p><strong>Timestamp:</strong> ${new Date(draft.updatedAt!).toLocaleString()}</p>
    ${statusChangeDetails ? `<p><strong>Details:</strong> ${escapeHtml(statusChangeDetails)}</p>` : ""}
    <hr/>
    <p>Log in to the Draft Approval Hub to view the full draft and any comments.</p>
  `;

  return await transporter.sendMail({
    from: process.env.GMAIL_USER!,
    to: submitterEmail,
    subject,
    html: htmlContent,
  });
}

/**
 * Send email with comment notification
 */
export async function sendCommentNotificationEmail(
  draft: Draft,
  commenter: User,
  commentContent: string,
  recipientEmail: string
) {
  const transporter = getTransporter();

  const subject = `New Comment on Draft: ${draft.title}`;

  const htmlContent = `
    <h2>New Comment on Your Draft</h2>
    <p>${escapeHtml(commenter.name)} has left a comment on your draft.</p>
    <hr/>
    <p><strong>Draft:</strong> ${escapeHtml(draft.title)}</p>
    <p><strong>Comment by:</strong> ${escapeHtml(commenter.name)} (${escapeHtml(commenter.email)})</p>
    <hr/>
    <p><strong>Comment:</strong></p>
    <blockquote>${escapeHtml(commentContent)}</blockquote>
    <hr/>
    <p>Log in to the Draft Approval Hub to reply or view more details.</p>
  `;

  return await transporter.sendMail({
    from: process.env.GMAIL_USER!,
    to: recipientEmail,
    subject,
    html: htmlContent,
  });
}

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(text: string): string {
  if (typeof text !== "string") return "";

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
