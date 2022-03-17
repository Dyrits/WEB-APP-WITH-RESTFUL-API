/*
Primary file for the API.
 */

// Local dependencies:
const _server = require("./lib/server");
const _workers = require("./lib/workers");

// Declare the app:
const app = {};

// Initialization:
app.init = () => {
  // Start the server:
  _server.init();
  // Start the workers
  _workers.init();
}

// Execute:
app.init();

// Export the app:
module.exports = app;