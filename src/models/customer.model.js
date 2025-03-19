import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    email: { type: String, required: true },
    contactNumber: { type: String, required: true },
    firstLineOfAddress: { type: String, required: true },
    town: { type: String, required: true },
    postcode: { type: String, required: true },
    selectedDate: { type: Date, required: true },
    totalPrice: { type: Number },
    selectedTimeSlot: {
      type: String,
      enum: [
        "9:00-9:45 AM",
        "9:45-10:30 AM",
        "10:30-11:15 AM",
        "11:15-12:00 PM",
        "12:00-12:45 PM",
        "12:45-1:30 PM",
        "1:30-2:15 PM",
        "2:15-3:00 PM",
      ],
      required: true,
    },
    selectService: {
      type: String,
      enum: ["Gutter Cleaning", "Gutter Repair"],
      required: true,
    },
    gutterCleaningOptions: {
      type: [String],
      enum: ["Garage", "Conservatory", "Extension", "None"],
    },
    gutterRepairsOptions: {
      type: [String],
      enum: [
        "Running Outlet",
        "Union Joint",
        "Corner",
        "Gutter Bracket",
        "Downpipe",
        "Gutter Length Replacement",
      ],
    },
    selectHomeType: {
      type: String,
      enum: [
        "Bungalow",
        "1 Bedroom",
        "2 Bedroom",
        "3 Bedroom",
        "4 Bedroom",
        "Town House/3 Stories",
      ],
    },
    selectHomeStyle: {
      type: String,
      enum: [
        "Terrace",
        "Semi-Detached",
        "Detached",
        "Bungalow",
        "Town House/3 Stories",
      ],
      required: true,
    },
    numberOfBedrooms: {
      type: String,
      enum: ["2 Bedroom", "3 Bedroom", "4 Bedroom", "5 Bedroom", "Ground"],
    },
    numberOfStories: {
      type: String,
      enum: ["1", "2", "3", "4"],
    },
    message: { type: String },
    photos: {
      type: [String],
    },
    termsConditions: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ["PayPal", "Mollie", "Cash"],
      required: true,
    },
    molliePaymentId: {
      type: String,
    },
    bookedBy: {
      type: String,
      enum: ["admin", "customer"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    paypalOrderId: {
      type: String,
      // Sparse index, will ignore documents where the value is null
    },
    captureId: {
      type: String,
      required: false, // Set to true if capture ID is mandatory for all transactions
      unique: false, // Optional: Ensure uniqueness if needed
    },
    refundId: {
      type: String,
      required: false, // Optional: Set to true if refund ID is mandatory
      unique: false, // Optional: Ensures uniqueness if needed
    },
    refundStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "reversed"],
      default: "pending",
    },
    refundAmount: {
      type: Number,
      required: false, // Optional: Set to true if you always need to track the refund amount
      min: 0, // Ensure refund amount is non-negative
    },
    refundReason: {
      type: String,
      required: false, // Optional: You can include this if you want to store reasons for refunds
    },
    refundDate: {
      type: Date,
      required: false, // Optional: Track the date when the refund was processed
    },
    isLocked: { type: Boolean, default: false },
    lockExpiresAt: { type: Date },
    isBooked: { type: Boolean, default: false },
  },
  { timestamps: true }
);
// Add sparse index for paypalOrderId to allow null values
// customerSchema.index({ paypalOrderId: 1 }, { sparse: true });
const Customer = mongoose.model("Customer", customerSchema);
export default Customer;
