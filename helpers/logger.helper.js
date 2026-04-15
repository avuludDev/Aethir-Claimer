import winston from 'winston';

// Define the logger configuration
var logLevels = {
    levels: {
        register: 0,
        edit: 2,
        info: 2,
        warn: 2,
        error: 2,
        proxy: 2
    }
};

export const logger = winston.createLogger({
  levels: logLevels.levels, // Set the logging level
  format: winston.format.combine(
    winston.format.timestamp({  format: 'HH:mm:ss' }) ,
    winston.format.colorize({ colors:{
        register: 'bgGreen',
        edit: 'bgGreen',
        info: 'magenta',
        warn: 'yellow',
        error: 'red',
        proxy: 'magenta'
    }}),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`+(info.splat!==undefined?`${info.splat}`:" "))
  ),
  transports: [
    new winston.transports.Console(), // Output to the console
    new winston.transports.File({ filename: './app.log' }) // Output to a file
  ]
});

export const banner = ``;