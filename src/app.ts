import express from "express";
import helmet from "helmet";
import smartlinkRouter from "./routes/smartlink.route";

const app = express();

// Security headers
app.use(helmet());

// Trust proxy — required if sitting behind Nginx/load balancer
// so req.ip reflects the real client IP, not the proxy's
app.set("trust proxy", 1);

app.use("/api", smartlinkRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Smart-link service running on port ${PORT}`);
});

export default app;
