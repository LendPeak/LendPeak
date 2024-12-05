import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize, errors } = format;

const isLambda = !!process.env.LAMBDA_TASK_ROOT;

// Define a custom format function
const customFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Create a format with no color (for Lambda)
const lambdaFormat = combine(errors({ stack: true }), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), customFormat);

// Create a format with color (for local development)
const localFormat = combine(errors({ stack: true }), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), colorize(), customFormat);

// Decide which format to use based on environment
const chosenFormat = isLambda ? lambdaFormat : localFormat;

// Base transports
const loggerTransports: (transports.ConsoleTransportInstance | transports.FileTransportInstance)[] = [
  new transports.Console({
    format: chosenFormat,
  }),
];

// Add file transports only if not in Lambda
if (!isLambda) {
  loggerTransports.push(
    new transports.File({
      filename: "logs/app.log",
      level: "info",
      format: lambdaFormat, // no color in file logs either
    })
  );

  loggerTransports.push(
    new transports.File({
      filename: "logs/exceptions.log",
      level: "error",
      handleExceptions: true,
      format: lambdaFormat,
    })
  );
}

const logger = createLogger({
  level: "info",
  format: chosenFormat,
  transports: loggerTransports,
  exitOnError: false,
});

// Handle uncaught exceptions
if (isLambda) {
  logger.exceptions.handle(
    new transports.Console({
      format: lambdaFormat, // no color in exception logs either
    })
  );
}

export default logger;
