import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import bodyParser from "body-parser";
import { config } from "./config.js";

import health from "./routes/health.js";
import licenseRoutes from "./routes/licenses.js";
import paddleRoutes from "./routes/paddle.js";
import tvRoutes from "./routes/tv.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// Security and logging
app.use(helmet());
app.use(morgan("combined"));

// For JSON routes, except Paddle where we read raw body inside the route
app.use((req, res, next) => {
  if (req.path === "/paddle/webhook") return next();
  bodyParser.json({ limit: "256kb" })(req, res, next);
});

// Routes
app.use("/", health);
app.use("/", licenseRoutes);
app.use("/", paddleRoutes);
app.use("/", tvRoutes);

// Minimal admin dashboard for quick checks
app.get("/admin", (req, res) => {
  res.type("html").sendFile(new URL("./views/admin.html", import.meta.url));
});

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`${config.appName} listening on ${config.port}`);
});
