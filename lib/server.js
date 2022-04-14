/*
Server-related tasks.
 */

// Dependencies~
const HTTP = require("http");
const HTTPS = require("https");
const URL = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const FS = require("fs");
const PATH = require("path");

// Local dependencies~
const ENV = require("./config");
const _handlers = require("./handlers");
const _helpers = require("./helpers");
const _logger = require("./logger");

const debug = _logger.console.debug("server");

// Instantiate the object:
const server = {};

// Instantiate the HTTP server:
server.http = HTTP.createServer((req, res) => {
    server.run(req, res);
});

// Instantiate the HTTPS server:
server.options = {
    key: FS.readFileSync(PATH.join(__dirname, "./../https/key.pem")),
    cert: FS.readFileSync(PATH.join(__dirname, "./../https/cert.pem")),
}
server.https = HTTPS.createServer(server.options, (req, res) => {
    server.run(req, res);
});

var qs = require('querystring');

// All the server logic for both HTTP and HTTPS server.
server.run = (req, res) => {
    // Get the URL and parse it:
    const url = URL.parse(req.url, true);
    // Get the path:
    const path = url.pathname.replace(/^\/+|\/+$/g, '');
    // Get the query string as an object:
    const { query } = url;
    // Get the HTTP Method:
    const method = req.method.toUpperCase();
    // Get the headers as an object:
    const { headers } = req;
    // Get the payload, if any:
    const decoder = new StringDecoder("utf-8");
    let buffer = String();
    req.on("data", data => { buffer += decoder.write(data); });
    req.on("end", () => {
        buffer += decoder.end();
        // Choose the handler this request should go to. If one is not found, use the notFound handler:
        let handler = path.includes("public/") ? _handlers.public : server.router[path] || _handlers.notFound;
        // Construct the data object to send to the handler:
        const data = {path, query, method, headers, payload: _helpers.JSON.parse(buffer)}
        // Route the request to the handler specified in the router:
        handler(data, (statusCode, payload, type) => {
            const types = {
                "json": { "Content-Type": "application/json", payload: JSON.stringify(payload) || JSON.stringify({}) },
                "html": { "Content-Type": "text/html", payload: payload || String() },
                "plain": { "Content-Type" : "text/plain", payload: payload || String() },
                "css": { "Content-Type" : "text/css", payload: payload || String() },
                "favicon": { "Content-Type" : "image/x-icon", payload: payload || String() },
                "png": { "Content-Type" : "image/png", payload: payload || String() },
                "jpg": { "Content-Type" : "image/jpeg", payload: payload || String() },
                "js": { "Content-Type" : "text/javascript", payload: payload || {} }
            }
            type = type in types ? type : "json";
            // Determine the type of response:
            res.setHeader("Content-Type", types[type]["Content-Type"]);
            // Determine the payload:
            let payloadString = types[type].payload;
            // Return the response:
            res.writeHead(statusCode);
            res.end(payloadString);
            // Log:
            if (statusCode === 200) { debug("\x1b[32m%s\x1b[0m", `${method.toUpperCase()} - Returning this response: `, statusCode, payloadString); }
            else { debug("\x1b[31m%s\x1b[0m", `${method.toUpperCase()} | Returning this response: `, statusCode, payloadString); }
        });
    });
}

// Define a request router:
server.router = {
    "": _handlers.index,
    "account/signup": _handlers.account.signup,
    "account/edit": _handlers.account.edit,
    "account/delete": _handlers.account.delete,
    "session/signin": _handlers.session.signin,
    "session/signout": _handlers.session.signout,
    "checks/checklist": _handlers.checklist,
    "checks/create:": _handlers.check.create,
    "checks/edit": _handlers.check.edit,
    "ping": _handlers.ping,
    "api/users": _handlers.users,
    "api/tokens": _handlers.tokens,
    "api/checks": _handlers.checks,
    "favicon.ico": _handlers.favicon,
    "public": _handlers.public
}

// Initialization script:
server.init = () => {
    // Start the HTTP server:
    server.http.listen(ENV.ports.http, () => {
        _logger.console.blue(`The server is listening on port ${ENV.ports.http}.`)
    })
    // Start the HTTPs server:
    server.https.listen(ENV.ports.https, () => {
        _logger.console.magenta(`The server is listening on port ${ENV.ports.https}.`)
    })
}

// Export the module:
module.exports = server;


