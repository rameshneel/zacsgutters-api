import Joi from "joi";

// Custom Joi extension for date validation if needed
const customJoi = Joi.extend((joi) => ({
  type: "string",
  base: joi.string(),
  messages: {
    "string.phone": "{{#label}} must be a valid phone number",
  },
  rules: {
    phone: {
      validate(value, helpers) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Basic international phone number validation
        if (!phoneRegex.test(value)) {
          return helpers.error("string.phone");
        }
        return value;
      },
    },
  },
}));

const validateCustomerInput = (data) => {
  const schema = customJoi.object({
    customerName: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "Customer name is required",
      "string.min": "Customer name must be at least 2 characters",
      "string.max": "Customer name cannot exceed 100 characters",
      "any.required": "Customer name is required",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    contactNumber: customJoi.string().phone().required().messages({
      "string.phone": "Please provide a valid phone number",
      "any.required": "Contact number is required",
    }),
    firstLineOfAddress: Joi.string()
      .trim()
      .min(3)
      .max(100)
      .required()
      .messages({
        "string.min": "First line of address must be at least 3 characters",
        "string.max": "First line of address cannot exceed 100 characters",
        "any.required": "First line of address is required",
      }),
    town: Joi.string().trim().min(2).max(50).required().messages({
      "string.min": "Town must be at least 2 characters",
      "string.max": "Town cannot exceed 50 characters",
      "any.required": "Town is required",
    }),
    postcode: Joi.string()
      .trim()
      .pattern(/^[A-Z0-9\s]{5,10}$/) // Example pattern, adjust based on your region's postcode format
      .required()
      .messages({
        "string.pattern.base": "Please provide a valid postcode",
        "any.required": "Postcode is required",
      }),
    selectedDate: Joi.date().iso().greater("now").required().messages({
      "date.greater": "Selected date must be in the future",
      "any.required": "Selected date is required",
    }),
    totalPrice: Joi.number().min(0).optional().messages({
      "number.min": "Total price cannot be negative",
    }),
    selectedTimeSlot: Joi.string()
      .valid(
        "9:00-9:45 AM",
        "9:45-10:30 AM",
        "10:30-11:15 AM",
        "11:15-12:00 PM",
        "12:00-12:45 PM",
        "12:45-1:30 PM",
        "1:30-2:15 PM",
        "2:15-3:00 PM"
      )
      .required()
      .messages({
        "any.only": "Please select a valid time slot",
        "any.required": "Time slot is required",
      }),
    selectService: Joi.string()
      .valid("Gutter Cleaning", "Gutter Repair")
      .required()
      .messages({
        "any.only": "Please select a valid service",
        "any.required": "Service selection is required",
      }),
    gutterCleaningOptions: Joi.array()
      .items(Joi.string().valid("Garage", "Conservatory", "Extension", "None"))
      .optional()
      .messages({
        "array.includes": "Invalid gutter cleaning option",
      }),
    gutterRepairsOptions: Joi.array()
      .items(
        Joi.string().valid(
          "Running Outlet",
          "Union Joint",
          "Corner",
          "Gutter Bracket",
          "Downpipe",
          "Gutter Length Replacement"
        )
      )
      .optional()
      .messages({
        "array.includes": "Invalid gutter repair option",
      }),
    selectHomeType: Joi.string()
      .valid(
        "Bungalow",
        "1 Bedroom",
        "2 Bedroom",
        "3 Bedroom",
        "4 Bedroom",
        "Town House/3 Stories"
      )
      .optional()
      .messages({
        "any.only": "Please select a valid home type",
      }),
    selectHomeStyle: Joi.string()
      .valid(
        "Terrace",
        "Semi-Detached",
        "Detached",
        "Bungalow",
        "Town House/3 Stories"
      )
      .required()
      .messages({
        "any.only": "Please select a valid home style",
        "any.required": "Home style is required",
      }),
    numberOfBedrooms: Joi.string()
      .valid("2 Bedroom", "3 Bedroom", "4 Bedroom", "5 Bedroom", "Ground")
      .optional()
      .messages({
        "any.only": "Please select a valid number of bedrooms",
      }),
    numberOfStories: Joi.string()
      .valid("1", "2", "3", "4")
      .optional()
      .messages({
        "any.only": "Please select a valid number of stories",
      }),
    message: Joi.string().max(500).optional().messages({
      "string.max": "Message cannot exceed 500 characters",
    }),
    photos: Joi.array().items(Joi.string()).optional(),
    termsConditions: Joi.boolean().default(false),
    paymentMethod: Joi.string()
      .valid("PayPal", "Mollie", "Cash")
      .required()
      .messages({
        "any.only": "Please select a valid payment method",
        "any.required": "Payment method is required",
      }),
    molliePaymentId: Joi.string().optional(),
    bookedBy: Joi.string().valid("admin", "customer").optional(),
    paymentStatus: Joi.string()
      .valid("pending", "completed", "failed", "cancelled")
      .default("pending"),
    paypalOrderId: Joi.string().optional(),
    captureId: Joi.string().optional(),
    refundId: Joi.string().optional(),
    refundStatus: Joi.string()
      .valid("pending", "completed", "failed", "reversed")
      .default("pending"),
    refundAmount: Joi.number().min(0).optional().messages({
      "number.min": "Refund amount cannot be negative",
    }),
    refundReason: Joi.string().max(200).optional().messages({
      "string.max": "Refund reason cannot exceed 200 characters",
    }),
    refundDate: Joi.date().iso().optional(),
    isLocked: Joi.boolean().default(false),
    lockExpiresAt: Joi.date().iso().optional(),
    isBooked: Joi.boolean().default(false),
  });

  return schema.validate(data, { abortEarly: false });
};

export default validateCustomerInput;
