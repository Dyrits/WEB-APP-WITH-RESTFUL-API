/*
Worker-related tasks.
 */

// Dependencies:
const PATH = require("path");
const FS = require("fs");
const HTTPS = require("https");
const HTTP = require("http");
const URL = require("url");

// Local dependencies:
const _editor = require("./editor");
const _helpers = require("./helpers");
const _logger = require("./logger");

const debug = _logger.console.debug("workers");

// Instantiate the worker object:
const workers = {};

// Lookup all checks, get their data, send them to a validator:
workers.collect = () => {
    // Get all the checks:
    _editor.list("checks", (err, checks) => {
        if (!err && checks && checks.length) {
            checks.forEach(id => {
                // Read in the check data:
                _editor.read("checks", id, (err, check) => {
                    if (!err && check) {
                        // Pass the data to the check validator and pass them to the next step in the process after validation:
                        workers.validate(check);
                    } else { debug("Error: Could not read one of the check's data."); }
                })
            })
        } else { debug("Error: Could not find any checks to process."); }
    })
}

// Sanity-check the check data:
workers.validate = check => {
    check = check || {};
    const id = check.id && check.id.trim().length === 20 ? check.id.trim() : false;
    check = {...check, ..._helpers._checks.parse(check)};
    // Set the keys that may not be set (if the workers have never seen this check before):
    check.state = ("up" || "down") ? check.state : "down";
    check.checked = check.checked > 0 ? check.checked : false;
    // If all the checks pass, pass the data along to the next step of the process:
    if (check.id && check.phone && check.protocol && check.url && check.method && check.codes && check.timeout) {
        workers.execute(check);
    } else { debug("Error: One of the check is not properly formatted. Skipping it."); }
}

// Perform the check, send the data and the outcome of the check process to the next step in the process:
workers.execute = (check) => {
    // Prepare the initial check outcome:
    const outcome = {
        "error": false,
        "response": false
    }
    // Mark that the outcome has not been sent yet:
    let sent = false;
    // Parse the hostname and the path out of the check data:
    const url = URL.parse(`${check.protocol}://${check.url}`, true);
    const hostname = url.hostname;
    const path = url.path; // Using "path" and not "pathname".
    // Construct the request:
    const details = {"protocol": `${check.protocol}:`, hostname, "method": check.method, path, "timeout": check.timeout * 1000}
    // Instantiate the request object (using either HTTP or HTTPS):
    const _module = check.protocol === "http" ? HTTP : HTTPS;
    const req = _module.request(details, res => {
        // Grab the status of the sent request and update the check and pass the data along
        outcome.code = res.statusCode;
        if (!sent) {
            workers.process(check, outcome);
            sent = true;
        }
    });
    // Bind to the error event so it doesn't get thrown:
    req.on("error", err => {
        // Update the check and pass the data along:
        outcome.error = {"error": true, "value": err};
        if (!sent) {
            workers.process(check, outcome);
            sent = true;
        }
    });
    // Bind to the timeout event:
    req.on("timeout", err => {
        // Update the check and pass the data along:
        outcome.error = {"error": true, "value": "timeout"};
        if (!sent) {
            workers.process(check, outcome);
            sent = true;
        }
    });
    // End the request:
    req.end();
}

// Process the check outcome, update the check data as needed, trigger an alert to the user if needed:
// Special logic for accommodating a check that has never been tested before.
workers.process = (check, outcome) => {
    // Decide if the check is considered up or down:
    const state = !outcome.error && outcome.code && check.codes.includes(outcome.code) ? "up" : "down";
    // Decide if an alter is warranted:
    const alert = check.checked && check.state !== state;
    // Lof the outcome:
    const time = Date.now();
    workers.log.log(check, outcome, state, alert, time);
    // Update the check data:
    check.state = state;
    check.checked = time;
    // Save the update:
    _editor.update("checks", check.id, check, err => {
        // Send the new check data to the next phase in the process:
        if (!err) { alert ? workers.alert(check) : debug("Check outcome has not changed, no alert needed."); }
        else { debug("Error: Could not save the update for one of the checks."); }
    })
}

// Alert the user as to a change in their check status:
workers.alert = check => {
    const message = `Alert: Your check for ${check.method.toUpperCase()} ${check.protocol}://${check.url} is currently ${check.state}.`
    _helpers.twilio.sendSMS(check.phone, message, err => {
        if (!err) { debug("Success: User was alert to a status change in their check, via SMS."); }
        else { debug("Error: Could not send the SMS alert."); }
    })
}

workers.log = {};

workers.log.log = (check, outcome, state, alert, time) => {
    // Form the log data && convert data to a string:
    const data = JSON.stringify({check, outcome, state, alert, time});
    // Determine the name of the log file:
    const name = check.id;
    // Append the log string to the file:
    _logger.append(name, data, err => {
        debug(`Logging to file ${err ? "failed" : "succeeded"}.`)
    })
}

// Rotate (compress) the log files:
workers.log.rotate = () => {
    // List all the (non compressed) log files:
    _logger.list(false, (err, logs) => {
        if(!err && logs && logs.length) {
            logs.forEach(log => {
                // Compress the data to a different file:
                const timestamp = `-${Date.now()}`;
                log = log.replace(".log", String());
                const compressed = `${log}${timestamp}`;
                _logger.compress(log, compressed, err => {
                    if (!err) {
                        // Truncate the log:
                        _logger.truncate(log, err => {
                            !err ? debug("Success: Log file was truncated.") : debug("Error: Could not truncate one of the file.")
                        })
                    } else { debug("Error: Could not compress one of the file.", err); }
                })
            })
        } else { console.error("Error: Could not find any logs to rotate."); }
    })
}

// Timer to execute the worker-process:
workers.loop = (method, seconds) => {
    const milliseconds = seconds * 1000;
    setInterval(() => { method(); }, milliseconds);
}

// Initialization:
workers.init = () => {
    // Send to console, in yellow:
    _logger.console.yellow("Background workers are running.");
    // Execute all the checks immediately:
    workers.collect();
    // Call the loop so the checks will execute later on:
    workers.loop(workers.collect, 60);
    // Compress all the logs immediately:
    workers.log.rotate();
    // Call the compression loop so logs will be compressed later on:
    workers.loop(workers.log.rotate, 86400)
}

// Export the module:
module.exports = workers;