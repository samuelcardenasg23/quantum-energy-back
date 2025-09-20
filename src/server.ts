import "dotenv/config";
import app from "./app";
const port = process.env.PORT;
const baseUrl = process.env.BASE_URL

app.listen(port, () => {
  console.log(`API:   ${baseUrl}:${port}`);
  console.log(`Docs:  ${baseUrl}:${port}/docs`);
  console.log(`Spec:  ${baseUrl}:${port}/openapi.json`);
});