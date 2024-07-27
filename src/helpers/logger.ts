import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { format } from 'mysql2';

// Create a log directory if it doesn't exist
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Get the current date and time in HH:MM_MM-DD-YYYY format
const now = new Date();
const formattedTime = [
  String(now.getHours()).padStart(2, '0'),   // HH
  String(now.getMinutes()).padStart(2, '0'), // MM
  String(now.getSeconds()).padStart(2, '0') // SS
].join('-'); // Use colon for time

const formattedDate = [
  String(now.getMonth() + 1).padStart(2, '0'), // MM
  String(now.getDate()).padStart(2, '0'),      // DD
  now.getFullYear(),                           // YYYY
].join('-');  // Use hyphen for date

const formattedString = `cli-${formattedTime}_${formattedDate}.log`;

// Define log file path with the formatted date and time
const logFilePath = path.join(logDir, formattedString);


// Create a winston logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    // Console transport (for all levels)
    new winston.transports.Console({
      level: 'info', // Adjust this level to control which levels appear in the console
    }),
    // File transport (for 'info' level and above)
    new winston.transports.File({
      filename: logFilePath,
      level: 'info', // Adjust this level to control which levels appear in the file
    }),
  ],
});

// Custom function to log only to the file
function logToFile(level: string, message: string, meta?: any) {
  logger.log({
    level,
    message,
    ...meta,
  });
}

// Usage example
logger.info('This message will be logged to both console and file.');
logToFile('info', 'This message will be logged only to the file.');

export default logger;
