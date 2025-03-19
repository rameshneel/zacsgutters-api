import dotenv from "dotenv";
import { createMollieClient } from "@mollie/api-client";
dotenv.config();
const mollieClient = createMollieClient({
  apiKey: process.env.MOLLIE_API_KEY,
});

// Create Payment
export async function createOrder(amount, bookingDetails) {
  // Validate input parameters
  if (!amount || amount <= 0) {
    throw new Error("Invalid amount: Payment amount must be positive");
  }

  if (!bookingDetails || !bookingDetails.id || !bookingDetails.selectService) {
    throw new Error("Incomplete booking details");
  }

  try {
    const webhookUrl = `${process.env.BASE_URL}/zacks-gutter/api/mollie-webhook`;
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const cancelUrl = `${baseUrl}/booking/booking-cancelled?id=${bookingDetails.id}`;
    const successUrl = `${baseUrl}/booking/confirmation?id=${bookingDetails.id}`;
    // Calculate expiration time (10 minutes from now)
    // const expirationTime = new Date(Date.now() + 10 * 60 * 1000);
    const payment = await mollieClient.payments.create({
      amount: {
        value: Number(amount).toFixed(2),
        currency: "GBP",
      },
      description: `Service: ${bookingDetails.selectService}, Date: ${bookingDetails.selectedDate}, Time: ${bookingDetails.selectedTimeSlot}`,
      cancelUrl,
      redirectUrl: successUrl,
      webhookUrl,
      // expiresAt: expirationTime.toISOString(),
      metadata: {
        bookingId: bookingDetails.id,
        service: bookingDetails.selectService,
        date: bookingDetails.selectedDate,
        timeSlot: bookingDetails.selectedTimeSlot,
      },
    });

    return {
      paymentId: payment.id,
      paymentUrl: payment._links.checkout.href,
    };
  } catch (error) {
    console.error("Error creating Mollie payment:", error.message);

    if (error.response) {
      console.error("Mollie API Error:", error.response.data);
      console.error("HTTP Status Code:", error.response.status);
    } else {
      console.error("Unexpected error:", error);
    }

    throw new Error("Failed to create payment. Please try again later.");
  }
}
export const refundPayment = async (paymentId, amount, reason, next) => {
  try {
    // Fetch the payment details to check its status
    const payment = await mollieClient.payments.get(paymentId);
    console.log("Payment details:", payment);

    if (payment.status !== "paid") {
      throw new Error(
        `Payment with ID ${paymentId} is not in a paid state. Current status: ${payment.status}`
      );
    }
    const paymentRefund = await mollieClient.paymentRefunds.create({
      paymentId: paymentId,
      amount: {
        value: Number(amount).toFixed(2),
        currency: "GBP",
      },
      description: reason,
    });

    console.log("refund log", paymentRefund);
    return paymentRefund;
  } catch (error) {
    // console.error("Error processing Mollie refund:", error);
    // throw new Error("Failed to process the refund with Mollie.",error);
    next(error);
  }
};
export async function cancelPayment(paymentId) {
  try {
    const payment = await mollieClient.payments.get(paymentId);

    // if (payment.status === "open") {
    //   const cancelResult = await mollieClient.payments.cancel(paymentId);
    //   console.log("Payment canceled successfully:", cancelResult);
    //   return cancelResult;
    // } else {
    //   console.error("Payment cannot be canceled, status:", payment.status);
    //   throw new Error("Payment is already processed or cannot be canceled.");
    // }
  } catch (error) {
    console.error("Error canceling payment:", error);
    throw error;
  }
}
export async function handlePaymentStatus(paymentId) {
  try {
    const payment = await mollieClient.payments.get(paymentId);
    return payment;
  } catch (error) {
    console.error("Error fetching payment status:", error.message);
    return res.status(500).json({ error: "Unable to fetch payment status" });
  }
}
