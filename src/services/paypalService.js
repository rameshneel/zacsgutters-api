// services/paypalService.js
import checkoutNodeJssdk from "@paypal/checkout-server-sdk";

function client() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

function environment() {
  let clientId = process.env.PAYPAL_CLIENT_ID;
  let clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
}

export async function createOrder(amount, bookingDetails) {
  console.log("log", amount);
  console.log("log1", bookingDetails);

  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "GBP",
          value: amount.toString(),
        },
        description: `Service: ${bookingDetails.selectService}, Date: ${bookingDetails.selectedDate}, Time: ${bookingDetails.selectedTimeSlot}`,
      },
    ],
    application_context: {
      return_url: "http://localhost:5173/paypal/return",
      cancel_url: "http://localhost:5173/booking-cancelled",
    },
  });

  const order = await client().execute(request);
  return order.result;
}

export async function capturePayment(orderId) {
  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const response = await client().execute(request);
  console.log("responce nn", response);
  return response.result;
}

export async function checkOrderStatus(orderId) {
  const request = new checkoutNodeJssdk.orders.OrdersGetRequest(orderId);
  const response = await client().execute(request);
  return response.result;
}
export async function refundPayment(captureId, amount) {
  // Capture ID ko use karte hain jo aapko payment capture ke response se milta hai
  const request = new checkoutNodeJssdk.payments.CapturesRefundRequest(
    captureId
  );

  // Agar partial refund chahiye toh amount specify karein, otherwise use empty object for full refund
  request.requestBody({
    amount: {
      currency_code: "GBP",
      value: amount.toString(), // Refund amount ko string mein convert karna
    },
  });

  try {
    const response = await client().execute(request);
    console.log("Refund response:", response);
    return response.result;
  } catch (error) {
    console.error("Refund error:", error);
    throw error;
  }
}
