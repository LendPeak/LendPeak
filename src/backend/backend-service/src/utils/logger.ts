import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize, errors } = format;

// Define your custom format
const customFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Determine if the code is running in AWS Lambda
const isLambda = !!process.env.LAMBDA_TASK_ROOT;

// Create an array of transports
const loggerTransports: (transports.ConsoleTransportInstance | transports.FileTransportInstance)[] = [
  // Console transport
  new transports.Console({
    format: combine(
      colorize(), // Colorize output in console
      customFormat
    ),
  }),
];

// Optionally add File transports if not running in Lambda
if (!isLambda) {
  // File transport for regular logs
  loggerTransports.push(
    new transports.File({
      filename: "logs/app.log",
      level: "info",
    })
  );

  // Exception handler transport for uncaught exceptions
  loggerTransports.push(
    new transports.File({
      filename: "logs/exceptions.log",
      level: "error",
      handleExceptions: true,
    })
  );
}

// Create the logger instance
const logger = createLogger({
  level: "info", // Set the minimum level of messages that this logger will handle
  format: combine(
    errors({ stack: true }), // <-- use errors format
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    customFormat
  ),
  transports: loggerTransports,
  exitOnError: false, // Do not exit on handled exceptions
});

// Handle uncaught exceptions in Lambda by logging to console
if (isLambda) {
  logger.exceptions.handle(
    new transports.Console({
      format: combine(colorize(), customFormat),
    })
  );
}

export default logger;
