import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";

// Use same secret key as JWTService
const ACCESS_SECRET = process.env.JWT_SECRET || "access_secret_123";

// Generate payload for s.carvajal@syc.com.co (driver id: 11)
const payload = {
  userId: "11",
  email: "s.carvajal@syc.com.co",
  role: "driver"
};

const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });

async function run() {
  console.log("Simulating driver request to upload a physical file:");
  console.log("- Driver ID: 11");
  console.log("- Email: s.carvajal@syc.com.co");
  console.log("- Token generated successfully");

  const url = "http://localhost:3000/api/vehicles/upload";
  
  try {
    const formData = new FormData();
    const blob = new Blob(["%PDF-1.5 dummy content"], { type: "application/pdf" });
    formData.append("file", blob, "test.pdf");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      },
      body: formData
    });

    console.log(`\nResponse Status: ${response.status} ${response.statusText}`);
    console.log("Response Headers:");
    response.headers.forEach((value, name) => {
      console.log(`  ${name}: ${value}`);
    });

    const body = await response.text();
    console.log("\nResponse Body:");
    console.log(body);

  } catch (err) {
    console.error("Fetch request failed:", err);
  }
}

run();
