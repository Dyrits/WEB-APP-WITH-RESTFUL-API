/*
* Create and export configuration variables~
 */

// Container for all the environments:
const ENV = {};

// Staging (default) environment:
ENV.STAGING = {
  "ports" : {
    "http": 3000,
    "https": 3001,
  },
  "hashKey": "ThisIsASecretKey",
  "name" : "STAGING",
  "maxChecks": 5,
  "twilio": {
    "account": "ACb32d411ad7fe886aac54c665d25e5c5d",
    "token": "9455e3eb3109edc12e3d8c92768f7a67",
    "from": "+15005550006"
  },
  "html": {
    "globals": {
      "appName" : "Uptime Checker",
      "companyName": "NotAReal Company, Inc.",
      "yearCreated": "2018",
      "baseURL": "http://localhost:3000"
    }
  }
};

// Production environment
ENV.PRODUCTION = {
  "ports" : {
    "http": 5000,
    "https": 5001,
  },
  "hashKey": "ThisIsASecretKey",
  "name" : "PRODUCTION",
  "maxChecks": 5,
  "twilio": {
    "account": "",
    "token": "",
    "from": ""
  },
  "html": {
    "globals": {
      "appName": "Uptime Checker",
      "companyName": "NotAReal Company, Inc.",
      "yearCreated": "2018",
      "baseURL": "http://localhost:5000"
    }
    }
};

// Determine which environment was passed as a command-line argument:
const NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV.toUpperCase() : "";
// Check that the current environment is one of the environments above, if not, default to staging:
const EXPORT_ENV = ENV[NODE_ENV] || ENV.STAGING;

// Export the environment:
module.exports = EXPORT_ENV;

