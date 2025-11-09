import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8080),
  env: process.env.NODE_ENV || "development",
  appName: process.env.APP_NAME || "GCode"
};
