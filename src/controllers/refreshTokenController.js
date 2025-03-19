// refreshTokenController.js
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js"; // Assume you have a User model
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const refreshToken = asyncHandler(async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find the user by id
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" } // Access token expires in 15 minutes
    );

    // Set the new access token in a cookie
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true, // Use secure in production
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    });

    res.json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.error("Error in refreshToken:", error);
    res.status(403).json({ message: "Invalid refresh token" });
  }
});
export const apiProtect = asyncHandler(async (req, res, next) => {
  try {
    // Assuming req.user is populated by a previous middleware that handles authentication
    const user = req.user;

    if (!user) {
      // If user is not authenticated, throw an ApiError
      throw new ApiError(401, "Unauthorized: Please log in.");
    }

    // If user is authenticated, respond with a success message
    res
      .status(200)
      .json(new ApiResponse(200, { message: "You are authenticated!" }));
  } catch (error) {
    // Pass errors to the global error handler
    return next(error);
  }
});
