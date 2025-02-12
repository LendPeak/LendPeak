import { Context, Next } from "koa";
import axios from "axios";
import logger from "../utils/logger";

type Method = "get" | "delete" | "head" | "options" | "post" | "put" | "patch" | "purge" | "link" | "unlink";

export const proxyController = async (ctx: Context, next: Next) => {
  let targetUrl = "";
  try {
    const targetDomainHeaderKey = Object.keys(ctx.headers).find((h) => /^lendpeak-target-domain$/i.test(h));
    const targetDomain = targetDomainHeaderKey ? ctx.headers[targetDomainHeaderKey] : undefined;

    if (!targetDomain) {
      logger.error("Missing lendpeak-target-domain header");
      logger.warn(`Request headers: ${JSON.stringify(ctx.headers)}`);
      ctx.status = 400;
      ctx.body = { error: "Missing lendpeak-target-domain header" };
      return await next();
    }

    const forwardHeadersKey = Object.keys(ctx.headers).find((h) => /^lendpeak-forward-headers$/i.test(h));
    const forwardHeaders = forwardHeadersKey && typeof ctx.headers[forwardHeadersKey] === "string" ? ctx.headers[forwardHeadersKey].split(",") : [];
    // Prepare headers to forward
    const headers: Record<string, string> = {};
    forwardHeaders.forEach((header) => {
      const headerKey = Object.keys(ctx.headers).find((h) => h.toLowerCase() === header.toLowerCase());
      if (headerKey) {
        const newHeaderKey = headerKey.match(/^lendpeak-/i) ? headerKey.replace(/^lendpeak-/i, "") : headerKey;
        headers[newHeaderKey] = ctx.headers[headerKey] as string;
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

    // logger.info("Proxy Request:", {
    //   method,
    //   url: targetUrl,
    //   headers,
    //   body: ctx.request.body,
    //   query: ctx.query,
    // });

    // print curl string with all parameters and headers, make sure to include query parameters
    logger.info(
      `curl -X ${method.toUpperCase()} '${targetUrl}' ${Object.entries(headers)
        .map(([key, value]) => `-H "${key}: ${value}"`)
        .join(" ")} ${Object.entries(params)
        .map(([key, value]) => `--data-urlencode "${key}=${value}"`)
        .join(" ")}`
    );

    

    const response = await axios({
      method,
      url: targetUrl,
      headers,
      data: ctx.request.body,
      params: ctx.query,
      responseType: "arraybuffer", 
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

    if (response.headers["content-type"]) {
      ctx.type = response.headers["content-type"];
    }

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
