/*
Library for storing and rotating logs.
 */

// Dependencies:
const FS = require("fs");
const PATH = require("path");
const ZLIB = require("zlib");
const UTIL = require("util");

// Container for the module:
logger = {};

// Base directory of the logs folder:
logger.base = PATH.join(__dirname, "/../.logs/");
logger.path = (file, extension = String()) => `${logger.base}${file}${extension}`;

// Append a string to a file. Create the if it does not exist:
logger.append = (file, data, callback) => {
    // Open the file for appending:
    FS.open(logger.path(file, ".log"), "a", (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Append to the file and close it:
            FS.appendFile(fileDescriptor, data + "\n", err => {
               if (!err) {
                    FS.close(fileDescriptor, err => {
                        !err ? callback(false) : callback("Error: Could not close the file that was being appended.")
                    })
               } else { callback("Error: Could not append the file."); }
            });
        } else { callback("Error: Could not open file for appending."); }
    })
}

// List all the logs, and optionally include the compressed logs:
logger.list = (all, callback) => {
    FS.readdir(logger.base, (err, logs) => {
        if (!err && logs && logs.length) {
            const trimmed = [];
            logs.forEach(log => {
                // Add the .log files:
                if (log.includes(".log")) { trimmed.push(log.replace(".log", String())); }
                // Add on the .gz  files:
                if (all && log.includes(".gz.b64")) { trimmed.push(log.replace(".gz.b64", String())); }
            })
            callback(false, trimmed);
        } else  { callback(err, logs); }
    })
}

// Compress the contents of one .log file into a .gz.b64 withing the same directory:
logger.compress = (log, compressed, callback) => {
    const source = `${log}.log`;
    const destination = `${compressed}.gz.b64`;
    // Read the source file:
    FS.readFile(logger.path(source), "utf8", (err, data) => {
        if (!err && data) {
            // Compress the data using GZIP:
            ZLIB.gzip(data, (err, buffer) => {
                if (!err && buffer) {
                    // Send the data to the destination file:
                    FS.open(logger.path(destination), "wx", (err, fileDescriptor) => {
                        if (!err && fileDescriptor) {
                            // Write to the destination file:
                            FS.writeFile(fileDescriptor, buffer.toString("base64"), err => {
                                if (!err) {
                                    // Close the destination file:
                                    FS.close(fileDescriptor, err => {
                                        !err ? callback(false) : callback(err);
                                    });
                                } else { callback(err); }
                            });
                        } else { callback(err); }
                    });
                } else { callback(err); }
            })
        } else { callback(err); }
    });
}

// Decompress the contents of a .gz.b64 file into a string variable:
logger.decompress = (compressed, callback) => {
    const source = `${compressed}.gz.b64`;
    FS.readFile(logger.path(source), "utf8", (err, data) => {
        if (!err && data) {
            // Decompress the data:
            const input = Buffer.from(data, "base64");
            ZLIB.unzip(input, (err, output) => {
                !err && output ? callback(false, output.toString()) : callback(err);
            });
        } else { callback(err); }
    });
}

// Truncate a log file:
logger.truncate = (log, callback) => {
    FS.truncate(logger.path(log, ".log"), 0, err => {
        !err ? callback(false) : callback(err);
    })
}

// Log to the console:
logger.console = {
    red: log => { console.log("\x1b[31m%s\x1b[0m", log); },
    green: log => { console.log("\x1b[32m%s\x1b[0m", log); },
    yellow: log => { console.log("\x1b[33m%s\x1b[0m", log); },
    blue: log => { console.log("\x1b[34m%s\x1b[0m", log); },
    magenta: log => { console.log("\x1b[35m%s\x1b[0m", log); }
}
logger.console.debug = (key) => UTIL.debuglog(key);

// Export the module:
module.exports = logger;