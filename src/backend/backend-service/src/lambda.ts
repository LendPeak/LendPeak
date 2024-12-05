import awsServerlessKoa from "aws-serverless-koa";
import app from "./app";

console.log("Initializing Lambda handler");

// Export the handler
export const handler = awsServerlessKoa(app);
