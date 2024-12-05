import { Context } from "koa";
import axios from "axios";
import logger from "../utils/logger";

type Method = "get" | "delete" | "head" | "options" | "post" | "put" | "patch" | "purge" | "link" | "unlink";

export const proxyController = async (ctx: Context) => {
  let targetUrl = "";
  try {
    const targetDomain = ctx.headers["x-target-domain"];
    const forwardHeaders = typeof ctx.headers["x-forward-headers"] === "string" ? ctx.headers["x-forward-headers"].split(",") : [];

    if (!targetDomain) {
      ctx.status = 400;
      ctx.body = { error: "Missing x-target-domain header" };
      return;
    }

    // Prepare headers to forward
    const headers: Record<string, string> = {};
    forwardHeaders.forEach((header) => {
      const headerKey = Object.keys(ctx.headers).find((h) => h.toLowerCase() === header.toLowerCase());
      if (headerKey) {
        headers[header] = ctx.headers[headerKey] as string;
      }
    });

    // Get the dynamic path from ctx.params.path
    const dynamicPath = ctx.params.path ? `/${ctx.params.path}` : "";

    targetUrl = `${targetDomain}${dynamicPath}`;

    // Make the proxied request
    const method = ctx.method.toLowerCase() as Method;

    logger.info(`Proxying ${method.toUpperCase()} request to ${targetUrl}`);

    const data = ctx.request.body;
    const params = ctx.query;

    // Log the request details
    logger.info(
      `Proxy Request: ${JSON.stringify({
        method,
        url: targetUrl,
        headers,
        body: data,
        query: params,
      })}`
    );

    logger.info("Proxy Request:", {
      method,
      url: targetUrl,
      headers,
      body: ctx.request.body,
      query: ctx.query,
    });

    const response = await axios({
      method,
      url: targetUrl,
      headers,
      data: ctx.request.body,
      params: ctx.query,
      responseType: "arraybuffer", // Changed from 'stream' to 'arraybuffer'
      validateStatus: () => true, // Allow handling of all HTTP status codes
    });

    // Set response headers
    ctx.status = response.status;

    const excludedHeaders = ["transfer-encoding", "content-length", "connection"];
    for (const [key, value] of Object.entries(response.headers)) {
      if (!excludedHeaders.includes(key.toLowerCase())) {
        ctx.set(key, value as string);
      }
    }

    // Set content type
    if (response.headers["content-type"]) {
      ctx.type = response.headers["content-type"];
    }

    // Set body
    ctx.body = Buffer.from(response.data as ArrayBuffer);

    logger.info(`Received ${response.status} response from ${targetUrl}`);
  } catch (error: any) {
    logger.error(`Error proxying request to ${targetUrl}: ${error.message}`);

    const axiosError = error;
    if (axiosError.response) {
      ctx.status = axiosError.response.status;

      // Safely extract data from error.response.data
      let errorDetails: string;
      if (axiosError.response.data) {
        if (typeof axiosError.response.data === "string") {
          errorDetails = axiosError.response.data;
        } else if (axiosError.response.data instanceof Buffer) {
          // Convert buffer to string
          errorDetails = axiosError.response.data.toString("utf-8");
        } else if (typeof axiosError.response.data === "object") {
          // Attempt to serialize error.response.data safely
          try {
            errorDetails = JSON.stringify(axiosError.response.data);
          } catch (serializationError) {
            errorDetails = "Unable to serialize error details.";
          }
        } else {
          errorDetails = "Internal server error";
        }
      } else {
        errorDetails = "Internal server error";
      }

      ctx.body = {
        error: axiosError.message,
        details: errorDetails,
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        error: "Network error",
        details: error.message,
      };
    }
  }
};