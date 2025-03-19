const servicePrices = {
  gutterCleaning: {
    Garage: 40,
    Conservatory: 40,
    Extension: 40,
  },
  gutterRepairs: {
    "Running Outlet": 65,
    "Union Joint": 65,
    Corner: 65,
    "Gutter Bracket": 65,
    Downpipe: 65,
  },
};

const housePrices = {
  Terrace: {
    "2 Bedroom": 69,
    "3 Bedroom": 69,
    "4 Bedroom": 79,
    "5 Bedroom": 129,
  },
  "Semi-Detached": {
    "2 Bedroom": 69,
    "3 Bedroom": 79,
    "4 Bedroom": 89,
    "5 Bedroom": 99,
  },
  Detached: {
    "2 Bedroom": 79,
    "3 Bedroom": 89,
    "4 Bedroom": 99,
    "5 Bedroom": 119,
  },
  Bungalow: {
    "2 Bedroom": 79,
    "3 Bedroom": 89,
    "4 Bedroom": 99,
    "5 Bedroom": 109,
    Ground: 0,
  },
  "Town House/3 Stories": {
    "3 Bedroom": 129,
    "4 Bedroom": 139,
  },
};

export const calculateTotalPrice = (formData) => {
  console.log("Received formData:", formData);
  let totalPrice = 0;

  // Special check for "Town House/3 Stories" to limit bedroom options
  if (
    formData.selectHomeStyle === "Town House/3 Stories" &&
    formData.numberOfBedrooms !== "3 Bedroom" &&
    formData.numberOfBedrooms !== "4 Bedroom"
  ) {
    console.log("Invalid bedroom selection for Town House/3 Stories.");
    return 0;
  }

  // Ensure gutterCleaningOptions and gutterRepairsOptions are arrays
  const gutterCleaningOptions = Array.isArray(formData.gutterCleaningOptions)
    ? formData.gutterCleaningOptions
    : [formData.gutterCleaningOptions];

  const gutterRepairsOptions = Array.isArray(formData.gutterRepairsOptions)
    ? formData.gutterRepairsOptions
    : [formData.gutterRepairsOptions];

  // Calculate base price based on house type and number of bedrooms ONLY for gutter cleaning
  if (formData.selectService === "Gutter Cleaning") {
    const basePrice =
      housePrices[formData.selectHomeStyle]?.[formData.numberOfBedrooms];

    console.log("Base price for gutter cleaning:", basePrice);

    if (basePrice) {
      totalPrice += basePrice;
    } else {
      console.log(
        "Base price not found for selected house style and bedroom count."
      );
    }

    // Add prices for gutter cleaning options
    console.log("Processing gutter cleaning options:", gutterCleaningOptions);
    gutterCleaningOptions.forEach((option) => {
      const price = servicePrices.gutterCleaning[option] || 0;
      console.log(`Adding ${option} gutter cleaning: £${price}`);
      totalPrice += price;
    });
  }

  // Add prices for gutter repair options
  if (formData.selectService === "Gutter Repair") {
    console.log("Processing gutter repair options:", gutterRepairsOptions);

    let repairPrice;
    if (
      formData.selectHomeStyle === "Bungalow" &&
      formData.numberOfBedrooms === "Ground"
    ) {
      repairPrice = 45;
    } else if (formData.selectHomeStyle === "Town House/3 Stories") {
      repairPrice = 85;
    } else {
      repairPrice = 65;
    }

    gutterRepairsOptions.forEach((option) => {
      console.log(`Adding ${option} gutter repair: £${repairPrice}`);
      totalPrice += repairPrice;
    });
  }

  // Calculate VAT (20%)
  const vatRate = 0.2;
  const vatAmount = totalPrice * vatRate;

  // Calculate total price including VAT
  const totalPriceWithVAT = totalPrice + vatAmount;

  console.log("Total price before VAT:", totalPrice);
  console.log("VAT amount:", vatAmount);
  console.log("Total price with VAT:", totalPriceWithVAT);

  return totalPrice;
};
