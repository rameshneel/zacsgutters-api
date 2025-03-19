import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();
// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};
console.log(process.env.EMAIL_HOST, process.env.EMAIL_PORT);
console.log(process.env.EMAIL_HOST, process.env.EMAIL_PORT);

// const emailConfig = {
//   host: "mail.demodrafts.com",
//   port: 465,
//   secure: true, // true for 465, false for other ports
//   auth: {
//     user: "smtp@demodrafts.com",
//     pass: "!D$]MV5B7Q!k",
//   },
// };
// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP connection error:", error);
  } else {
    console.log("SMTP connection is ready");
  }
});

// Helper functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Send email function
const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: "Booking <enquiries@zacsgutters.co.uk>",
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

export const sendCustomerConfirmationEmail = async (
  customer,
  bookingDetails
) => {
  const { date, timeSlot, amount, serviceDescription } = bookingDetails;

  // Determine service-specific options to include in the email
  let serviceOptions = "";
  if (
    serviceDescription === "Gutter Cleaning" &&
    customer.gutterCleaningOptions.length > 0
  ) {
    serviceOptions = `<p><strong>Gutter Cleaning Checked:</strong> ${customer.gutterCleaningOptions.join(
      ", "
    )}</p>`;
  } else if (
    serviceDescription === "Gutter Repair" &&
    customer.gutterRepairsOptions.length > 0
  ) {
    serviceOptions = `<p><strong>Gutter Repair Checked:</strong> ${customer.gutterRepairsOptions.join(
      ", "
    )}</p>`;
  }

  const emailSubject = "Your Booking is Confirmed!";
  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF0000; color: black; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
        .booking-details { background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 5px; padding: 15px; margin-top: 20px; }
        .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
        .btn { display: inline-block; padding: 10px 20px; background-color: #FF0000; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Booking is Confirmed!</h1>
        </div>
        <div class="content">
          <p>Dear ${customer.customerName},</p>
          <p>Thank you for choosing our service. We're delighted to confirm your appointment.</p>
          
          <div class="booking-details">
            <h2>Booking Details</h2>
            <p><strong>Date:</strong> ${formatDate(date)}</p>
            <p><strong>Time:</strong> ${timeSlot}</p>
            <p><strong>Service:</strong> ${serviceDescription}, ${
    customer.numberOfBedrooms
  }, ${customer.selectHomeStyle}</p>
            ${serviceOptions}
            <p><strong>Amount Paid:</strong>£ ${formatCurrency(amount)}</p>
          </div>
          
          <p>We're looking forward to serving you. If you need to make any changes, please contact us at least 24 hours before your appointment.</p>
          
          <p>For any questions or assistance, please don't hesitate to reach out to us:</p>
          <p>
            <a href="mailto:${
              process.env.COMPANY_EMAIL
            }" class="btn" style="margin-left: 10px;">Email Us</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${
    process.env.COMPANY_NAME
  }. All rights reserved.</p>
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(customer.email, emailSubject, emailBody);
};
// Admin notification email
export const sendAdminNotificationEmail = async (
  customer,
  bookingDetails,
  captureDetails
) => {
  const { date, timeSlot, amount, serviceDescription } = bookingDetails;
  const { id: orderID, status, purchase_units } = captureDetails;
  // Determine service-specific options to include in the email
  let serviceOptions = "";
  if (
    serviceDescription === "Gutter Cleaning" &&
    customer.gutterCleaningOptions.length > 0
  ) {
    serviceOptions = ` <tr><th>Gutter Cleaning Checked:</th><td> ${customer.gutterCleaningOptions.join(
      ", "
    )}</td></tr>`;
  } else if (
    serviceDescription === "Gutter Repair" &&
    customer.gutterRepairsOptions.length > 0
  ) {
    serviceOptions = `<tr><th>Gutter Repair Checked:</th><td> ${customer.gutterRepairsOptions.join(
      ", "
    )}</td></tr>`;
  }
  const emailSubject = "New Booking Alert: Customer Appointment Confirmed";

  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Booking Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF0000; color: black; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
        .section { margin-bottom: 20px; }
        .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Booking Notification</h1>
        </div>
        <div class="content">
          <div class="section">
            <h2>Customer Information</h2>
            <table>
              <tr><th>Name</th><td>${customer.customerName}</td></tr>
              <tr><th>Email</th><td>${customer.email}</td></tr>
              <tr><th>Phone</th><td>${customer.contactNumber || "N/A"}</td></tr>
               <tr><th>first Line Of Address</th><td>${
                 customer.firstLineOfAddress || "N/A"
               }</td></tr>
                <tr><th>Town</th><td>${customer.town || "N/A"}</td></tr>
                <tr><th>Post Code</th><td>${
                  customer.postcode || "N/A"
                }</td></tr>
                
            </table>
          </div>
          
          <div class="section">
            <h2>Booking Details</h2>
            <table>
              <tr><th>Date</th><td>${formatDate(date)}</td></tr>
              <tr><th>Time</th><td>${timeSlot}</td></tr>
              <tr><th>Service</th><td> ${serviceDescription}, ${
    customer.numberOfBedrooms
  },${customer.selectHomeStyle}</td></tr>
               ${serviceOptions}
              <tr><th>Amount Paid</th><td>${formatCurrency(amount)}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Payment Information</h2>
            <table>
              <tr><th>Order ID</th><td>${orderID}</td></tr>
              <tr><th>Status</th><td>${status}</td></tr>
              <tr><th>Payment Method</th><td>${customer.paymentMethod}</td></tr>
            </table>
          </div>
          
          <p>Please ensure all necessary preparations are made for this appointment.</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from your Booking System.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(process.env.ADMIN_EMAIL, emailSubject, emailBody);
};
export const sendCustomerRefundEmail = async (customer, refundDetails) => {
  const emailSubject = "Your Refund Has Been Processed";
  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Refund Notification</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #FF0000;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #FF0000;
          color: #ffffff;
          padding: 20px;
          text-align: center;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .content {
          padding: 20px;
        }
        .booking-details {
          background-color: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 5px;
          padding: 15px;
          margin-top: 20px;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #888;
          text-align: center;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background-color: #FF0000;
          color: #ffffff;
          text-decoration: none;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Refund Has Been Processed</h1>
        </div>
        <div class="content">
          <p>Dear ${customer.customerName},</p>
          <p>We're writing to inform you that your recent payment has been refunded.</p>
          <p>Refund Details:</p>
          <ul>
            <li>Refund ID: ${refundDetails.id}</li>
            <li>Refund Amount: ${formatCurrency(customer.refundAmount)}</li>
            <li>Refund Status: ${refundDetails.status}</li>
          </ul>
          <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
          <p>Best regards,<br>
          ${process.env.COMPANY_NAME}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${
    process.env.COMPANY_NAME
  }. All rights reserved.</p>
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(customer.email, emailSubject, emailBody);
};
export const sendAdminRefundNotificationEmail = async (
  customer,
  refundDetails
) => {
  const emailSubject = "New Refund Notification";
  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Refund Notification</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #FF0000;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #FF0000;
          color: #ffffff;
          padding: 20px;
          text-align: center;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .content {
          padding: 20px;
        }
        .section {
          margin-bottom: 20px;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #888;
          text-align: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f2f2f2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Refund Notification</h1>
        </div>
        <div class="content">
          <p>Dear Admin,</p>
          <p>A refund has been processed for the following customer:</p>
          <ul>
            <li>Customer Name: ${customer.customerName}</li>
            <li>Customer Email: ${customer.email}</li>
            <li>Refund ID: ${refundDetails.id}</li>
            <li>Refund Amount: ${formatCurrency(customer.refundAmount)}</li>
            <li>Refund Status: ${refundDetails.status}</li>
            <li>Refund Reason: ${customer.refundReason}</li>
          </ul>
          <p>Please review the refund details and take any necessary actions.</p>
          <p>Best regards,<br>
          ${process.env.COMPANY_NAME}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${
    process.env.COMPANY_NAME
  }. All rights reserved.</p>
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(process.env.ADMIN_EMAIL, emailSubject, emailBody);
};

// // src/utils/email.service.js

// import nodemailer from "nodemailer";
// import config from "../config/index.js";

// // Configure nodemailer transporter
// const transporter = nodemailer.createTransport({
//   // Your email service configuration here
//   // For example:
//   host: config.emailHost,
//   port: config.emailPort,
//   secure: config.emailSecure,
//   auth: {
//     user: config.emailUser,
//     pass: config.emailPassword,
//   },
// });
// const sendEmail = async (to, subject, html) => {
//   try {
//     await transporter.sendMail({
//       from: config.emailFrom,
//       to,
//       subject,
//       html,
//     });
//     console.log(`Email sent successfully to ${to}`);
//   } catch (error) {
//     console.error("Error sending email:", error);
//     throw new Error("Failed to send email");
//   }
// };

// const formatCurrency = (amount) => {
//   return new Intl.NumberFormat("en-US", {
//     style: "currency",
//     currency: "USD",
//   }).format(amount);
// };

// const formatDate = (dateString) => {
//   return new Date(dateString).toLocaleDateString("en-US", {
//     weekday: "long",
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//   });
// };

// export const sendCustomerConfirmationEmail = async (
//   customer,
//   bookingDetails
// ) => {
//   const { date, timeSlot, amount, serviceDescription } = bookingDetails;

//   const emailSubject = "Your Booking is Confirmed! 🎉";

//   const emailBody = `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <title>Booking Confirmation</title>
//       <style>
//         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
//         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//         .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
//         .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
//         .booking-details { background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 5px; padding: 15px; margin-top: 20px; }
//         .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
//         .btn { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
//       </style>
//     </head>
//     <body>
//       <div class="container">
//         <div class="header">
//           <h1>Your Booking is Confirmed! 🎉</h1>
//         </div>
//         <div class="content">
//           <p>Dear ${customer.name},</p>
//           <p>Thank you for choosing our service. We're delighted to confirm your appointment.</p>

//           <div class="booking-details">
//             <h2>Booking Details</h2>
//             <p><strong>Date:</strong> ${formatDate(date)}</p>
//             <p><strong>Time:</strong> ${timeSlot}</p>
//             <p><strong>Service:</strong> ${serviceDescription}</p>
//             <p><strong>Amount Paid:</strong> ${formatCurrency(amount)}</p>
//           </div>

//           <p>We're looking forward to serving you. If you need to make any changes, please contact us at least 24 hours before your appointment.</p>

//           <p>For any questions or assistance, please don't hesitate to reach out to us:</p>
//           <p>
//             <a href="tel:${config.companyPhone}" class="btn">Call Us</a>
//             <a href="mailto:${
//               config.companyEmail
//             }" class="btn" style="margin-left: 10px;">Email Us</a>
//           </p>
//         </div>
//         <div class="footer">
//           <p>&copy; ${new Date().getFullYear()} ${
//     config.companyName
//   }. All rights reserved.</p>
//           <p>This is an automated email. Please do not reply directly to this message.</p>
//         </div>
//       </div>
//     </body>
//     </html>
//   `;

//   await sendEmail(customer.email, emailSubject, emailBody);
// };

// export const sendAdminNotificationEmail = async (
//   customer,
//   bookingDetails,
//   captureDetails
// ) => {
//   const { date, timeSlot, amount, serviceDescription } = bookingDetails;
//   const { id: orderID, status, purchase_units } = captureDetails;

//   const emailSubject = "New Booking Alert: Customer Appointment Confirmed";

//   const emailBody = `
//     <html>
//       <head>
//         <style>
//           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//           .header { background-color: #3498db; color: white; padding: 20px; text-align: center; }
//           .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
//           .section { margin-bottom: 20px; }
//           .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
//           table { width: 100%; border-collapse: collapse; }
//           th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
//           th { background-color: #f2f2f2; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>New Booking Notification</h1>
//           </div>
//           <div class="content">
//             <div class="section">
//               <h2>Customer Information</h2>
//               <table>
//                 <tr><th>Name</th><td>${customer.name}</td></tr>
//                 <tr><th>Email</th><td>${customer.email}</td></tr>
//                 <tr><th>Phone</th><td>${customer.phone || "N/A"}</td></tr>
//               </table>
//             </div>

//             <div class="section">
//               <h2>Booking Details</h2>
//               <table>
//                 <tr><th>Date</th><td>${formatDate(date)}</td></tr>
//                 <tr><th>Time</th><td>${timeSlot}</td></tr>
//                 <tr><th>Service</th><td>${serviceDescription}</td></tr>
//                 <tr><th>Amount Paid</th><td>${formatCurrency(amount)}</td></tr>
//               </table>
//             </div>

//             <div class="section">
//               <h2>Payment Information</h2>
//               <table>
//                 <tr><th>Order ID</th><td>${orderID}</td></tr>
//                 <tr><th>Status</th><td>${status}</td></tr>
//                 <tr><th>Payment Method</th><td>${
//                   purchase_units[0].payments.captures[0].payment_method
//                 }</td></tr>
//               </table>
//             </div>

//             <p>Please ensure all necessary preparations are made for this appointment.</p>
//           </div>
//           <div class="footer">
//             <p>This is an automated notification from your Booking System.</p>
//           </div>
//         </div>
//       </body>
//     </html>
//   `;

//   await sendEmail(config.adminEmail, emailSubject, emailBody);
// };
