import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  // res.cookie("jwt", token, {
  //   maxAge: 7 * 24 * 60 * 60 * 1000,
  //   httpOnly: true,
  //   sameSite: "lax", // This allows cookies for same-site requests
  //   secure: true, // Must be true for HTTPS
  // });
  
  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // only secure in production
  });
  

  return token;
};




