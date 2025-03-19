import nodemailer from "nodemailer";
import { ApiError } from "./ApiError.js";

const createTransporter = () => {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASSWORD } =
    process.env;

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT, 10),
    secure: EMAIL_SECURE === "true",
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
  });
};

const sendEmail = async ({ to, subject, html, from, attachments = [] }) => {
  if (!to || !subject || !html) {
    throw new ApiError(400, "Missing required parameters");
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();

    const info = await transporter.sendMail({
      from: from || process.env.EMAIL_FROM,
      to,
      subject,
      html,
      attachments,
    });

    if (!info || !info.messageId) {
      throw new ApiError(500, "Failed to send email");
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new ApiError(500, "Error sending email");
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL}/verify-token/${resetToken}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Password Reset Request</h1>
        <p>Hello,</p>
        <p>We received a request to reset the password for your account (${email}).</p>
        <p>Please click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Your Password</a>
        <p>If you didn't request this, please ignore this email.</p>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Password Reset Request",
    html,
  });
};

export default {
  sendPasswordResetEmail,
};
