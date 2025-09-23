import "dotenv/config";
import app from "./app";
const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || "0.0.0.0";

app.listen(port, () => {
  console.log(`API:   ${baseUrl}:${port}`);
  console.log(`Docs:  ${baseUrl}:${port}/docs`);
  console.log(`Spec:  ${baseUrl}:${port}/openapi.json`);
});