"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Create a log directory if it doesn't exist
const logDir = path_1.default.join(__dirname, '../../logs');
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir);
}
// Get the current date and time in HH:MM_MM-DD-YYYY format
const now = new Date();
const formattedTime = [
    String(now.getHours()).padStart(2, '0'), // HH
    String(now.getMinutes()).padStart(2, '0'), // MM
    String(now.getSeconds()).padStart(2, '0') // SS
].join('-'); // Use colon for time
const formattedDate = [
    String(now.getMonth() + 1).padStart(2, '0'), // MM
    String(now.getDate()).padStart(2, '0'), // DD
    now.getFullYear(), // YYYY
].join('-'); // Use hyphen for date
const formattedString = `cli-${formattedTime}_${formattedDate}.log`;
// Define log file path with the formatted date and time
const logFilePath = path_1.default.join(logDir, formattedString);
// Create a winston logger instance
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level}]: ${message}`;
    })),
    transports: [
        // Console transport (for all levels)
        new winston_1.default.transports.Console({
            level: 'info', // Adjust this level to control which levels appear in the console
        }),
        // File transport (for 'info' level and above)
        new winston_1.default.transports.File({
            filename: logFilePath,
            level: 'info', // Adjust this level to control which levels appear in the file
        }),
    ],
});
// Custom function to log only to the file
function logToFile(level, message, meta) {
    logger.log(Object.assign({ level,
        message }, meta));
}
// Usage example
logger.info('This message will be logged to both console and file.');
logToFile('info', 'This message will be logged only to the file.');
exports.default = logger;
//# sourceMappingURL=logger.js.map