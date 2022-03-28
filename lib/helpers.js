/*
Helpers for various tasks.
 */

// Dependencies
const CRYPTO = require("crypto");
const HTTPS = require("https");
const QUERYSTRING = require("querystring");
const PATH = require("path");
const FS = require("fs");

// Local dependencies:
const ENV = require("./config");

// Container for all the helpers:
const helpers = {};

// Create a SHA256 hash:
helpers.hash = (string) => {
  return string ? CRYPTO.createHmac("sha256", ENV.hashKey).update(string).digest("hex") : false;
}

helpers.JSON = {};
helpers.HTML = {};
helpers.random = {};
helpers.twilio = {}
helpers._checks = {};


// Parse a JSON string to an object in all cases, without throwing an error:
helpers.JSON.parse = string => {
  try { return JSON.parse(string); }
  catch (error) { return {}; }
}

// Create a string of random alphanumeric characters of a given length:
helpers.random.string = length => {
  // Define all the possible characters that could fo into a string:
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  // Start the final string:
  let string = String();
  for (let iteration = 0; iteration < length; iteration ++) {
    // Get a random character:
    let character = characters.charAt(Math.floor(Math.random() * characters.length))
    // Append this character to the final string:
    string += character;
  }
  return string;
}

// Send an SMS message via Twilio
helpers.twilio.sendSMS = (phone, message, callback) => {
  // Validate the parameters:
  phone = phone.trim().length === 10 ? phone.trim() : false;
  message = message.trim() && message.trim().length < 1601 ? message.trim() : false;
  if (phone && message) {
    // Configure the request payload:
    let payload = {
      "From": ENV.twilio.from,
      "To": `+1${phone}`,
      "Body": message
    }
    // Stringify the payload:
    payload = QUERYSTRING.stringify(payload);
    // Configure the request details:
    const details = {
      "protocol": "https:",
      "hostname": "api.twilio.com",
      "method": "POST",
      "path": `/2010-04-01/Accounts/${ENV.twilio.account}/Messages.json`,
      "auth": `${ENV.twilio.account}:${ENV.twilio.token}`,
      "headers": {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(payload)
      }
    }
    // Instantiate the request object:
    const req = HTTPS.request(details, res => {
      // Grab the status of the sent request:
      const status = res.statusCode;
      // Callback successfully if the request wen through:
      if ([200, 201].includes(status)) { callback(false); }
      else { callback(`Status code returned was ${status}.`); }
    });
    // Bind to the error event so it doesn't get thrown:
    req.on("error", err => { callback(err); })
    // Add the payload:
    req.write(payload);
    // End the request:
    req.end();
  } else { callback("Given parameters were missing or invalid."); }

}

// Parse a payload or a check object and return the different fields:
helpers._checks.parse = (payload) => {
  const protocol = payload.protocol && ["HTTPS", "HTTP"].includes(payload.protocol.toUpperCase()) ? payload.protocol : false;
  const url = payload.url || false;
  const method = payload.method && ["POST", "GET", "PUT", "DELETE"].includes(payload.method.toUpperCase()) ? payload.method.toUpperCase() : false;
  const codes = payload.codes || false;
  const timeout = payload.timeout > 0 && payload.timeout < 6 ? payload.timeout : false;
  return {protocol, url, method, codes, timeout};
}

helpers.HTML.getTemplate = (name, data, callback) => {
  !name && callback("A valid template name was not specified.")
  data = data || {};
  if (name) {
    const directory = PATH.join(__dirname, "/../templates/");
    FS.readFile(directory + name + ".html", "utf8", (err, string) => {
      !err && string && string.length ?
          callback(false, helpers.HTML.interpolate(string, data)) :
          callback("No template could be found.");
    });
  }
}

helpers.HTML.build = (string, data, callback) => {
  helpers.HTML.getTemplate('_header', data, (err, header) => {
    if (!err && header) {
      helpers.HTML.getTemplate("_footer", data, (err, footer) => {
        !err && footer ? callback(false, header + string + footer) : callback("The header template could not be found.");
      })
    } else { callback("The header template could not be found."); }
  })
}

helpers.HTML.interpolate = (string, data) => {
  for (const key in ENV.html.globals) { data[`global.${key}`] = ENV.html.globals[key]; }
  for (const key in data) { string = string.replace(`{${key}}`, data[key]); }
  return string;
}

helpers.getStaticAsset = (name, callback) => {
  name = name.length && name;
  if (name) {
    const directory = PATH.join(__dirname, "/../public/");
    FS.readFile(directory + name, (err, data) => {
      !err && data ? callback(false, data) : callback("No file could be found.");
    });
  } else { callback("A valid file name was not specified."); }
}



// Export the module:
module.exports = helpers;
