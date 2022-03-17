/*
Request handlers.
 */

// Local dependencies
const ENV = require("./config");
const _editor = require("./editor");
const _helpers = require("./helpers");

// Define the handlers:
const handlers = {};
handlers.ping = (data, callback) => {
  // Callback a HTTP status code, and a payload object:
  callback(200);
}
handlers.notFound = (data, callback) => {
  callback(404);
}

/*
HTML handlers
 */

// Index handler:
handlers.index = (data, callback) => {
  // Reject any request that isn't a GET:
  data.method !== "GET" && callback(405, undefined, "html");
  if (data.method === "GET") {
    // Read in a template as a string:
    _helpers.HTML.getTemplate("index", (err, string) => {
      !err && string ? callback(200, string, "html") : callback(500, undefined, "html");
    });
  }
}

handlers.account = {};
handlers.session = {};
handlers.check = {};

/*
JSON API handlers
 */

// Users handler:
handlers.users = (data, callback) => {
  const accepted = ["POST", "GET", "PUT", "DELETE"];
  const method = data.method;
  accepted.includes(method.toUpperCase()) ? handlers._users[method.toLowerCase()](data, callback) : callback(405);
}
// Container for the users submethods:
handlers._users = {}
// Users - POST
// Required data: firstName, lastName, phone, password, agreementTOS
// Optional data: None
handlers._users.post = (data, callback) => {
  // Check that all the required fields are filled out:
  const firstName = data.payload.firstName && data.payload.firstName.trim() || false;
  const lastName = data.payload.lastName && data.payload.lastName.trim() || false;
  const phone = data.payload.phone && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  const password = data.payload.password && data.payload.password.trim() || false;
  const agreementTOS = data.payload.agreementTOS || false;
  if (firstName && lastName && phone && password && agreementTOS) {
    // Make sure that the user doesn't already exist:
    _editor.read("users", phone, (err, user) => {
      if (err) {
        // Hash the password:
        const hashedPassword = _helpers.hash(password);
        if (hashedPassword) {
          // Create the user object:
          const user = { firstName, lastName, phone, hashedPassword, agreementTOS };
          // Store the user:
          _editor.create("users", phone, user, err => {
            !err ? callback(200, user) : callback(500, {"Error": "Could not create the new user."});
          });
        } else { callback(500, {"Error": "Could not hash the password."}) }
      } else { callback(400, {"Error" : "A user with that phone number already exists."}); }
    });
  } else { callback(400, {"Error" : "Missing required fields"}); }
};
// Users - GET
// Required data: phone
// Optional data: None
handlers._users.get = (data, callback) => {
  // Check that the phone number is valid:
  const phone = data.query.phone && data.query.phone.trim().length === 10 ? data.query.phone.trim() : false;
  if (phone) {
    // Get the token from the headers:
    const id = data.headers.token || false;
    // Verify that the given token is valid for the phone number:
    handlers._tokens.verify(id, phone, validity => {
      if (validity) {
        _editor.read("users", phone, (err, user) => {
          if (!err && user) {
            // Remove the hashed password from the user object before returning it:
            delete user.hashedPassword;
            callback(200, user);
          } else { callback(404); }
        });
      } else { callback(403, {"Error" : "Missing required token in header, or token is invalid."}); }
    });
  } else { callback(400, {"Error": "Missing required field."}); }
};
// Users - PUT
// Required data: phone
// Option data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {
  // Check that the phone number is valid:
  const phone = data.payload.phone && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  // Check for the optional fields:
  const firstName = data.payload.firstName && data.payload.firstName.trim() || false;
  const lastName = data.payload.lastName && data.payload.lastName.trim() || false;
  const password = data.payload.password && data.payload.password.trim() || false;
  // Error if the phone is invalid:
  if (phone && (firstName || lastName || password)) {
    // Get the token from the headers:
    const id = data.headers.token || false;
    // Verify that the given token is valid for the phone number:
    handlers._tokens.verify(id, phone, validity => {
      if (validity) {
        // Lookup the user:
        _editor.read("users", phone, (err, user) => {
          if (!err && user) {
            // Update the fields:
            firstName && (user.firstName = firstName);
            lastName && (user.lastName = lastName);
            password && (user.hashedPassword = _helpers.hash(password));
            // Store the data:
            _editor.update("users", phone, user, err => {
              !err ? callback(200, user) : callback(500, {"Error" : "Could not update the user"});
            });
          } else { callback(400, {"Error": "The specified user does not exist."}); }
        });
      } else { callback(403, {"Error" : "Missing required token in header, or token is invalid."}); }
    })
  } else { callback(400, {"Error": "Missing required field or at least one optional field to update."})}
};
// Users - DELETE
// Required data: phone
// Optional data: None
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid:
  const phone = data.query.phone && data.query.phone.trim().length === 10 ? data.query.phone.trim() : false;
  if (phone) {
    // Get the token from the headers:
    const id = data.headers.token || false;
    // Verify that the given token is valid for the phone number:
    handlers._tokens.verify(id, phone, validity => {
      if (validity) {
        _editor.read("users", phone, (err, user) => {
          if (!err && user) {
            delete user.hashedPassword;
            delete user.agreementTOS;
            _editor.delete("users", phone, err => {
              if (!err) {
                const checks = user.checks || [];
                const files = []
                // Loop through the checks:
                checks.forEach(id => {
                  _editor.delete("checks", id, err => {
                    err && files.push(`${id}.json`);
                  });
                });
                !files.length ? callback(200, user) : callback(500, {
                  "Error" : "At least one error occurred while trying to delete the checks associated with the deleted user.",
                  "Important" : `The following files may not have been deleted for the system successfully: [${files}].`
                })
              } else { callback(500, {"Error": "Could not delete the user"}); }
            });
          } else { callback(400, {"Error": "The specified user does not exist."}); }
        });
      } else { callback(403, {"Error" : "Missing required token in header, or token is invalid."}); }
    })
  } else { callback(400, {"Error": "Missing required field."}); }
};

// Tokens handler:
handlers.tokens = (data, callback) => {
  const accepted = ["POST", "GET", "PUT", "DELETE"];
  const method = data.method;
  accepted.includes(method.toUpperCase()) ? handlers._tokens[method.toLowerCase()](data, callback) : callback(405);
}
// Container for all the tokens methods
handlers._tokens = {}
// Tokens - POST
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  // Check that all the required fields are filled out:
  const phone = data.payload.phone && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  const password = data.payload.password && data.payload.password.trim() || false;
  if (phone && password) {
    // Make sure that the user doesn't already exist:
    _editor.read("users", phone, (err, user) => {
      if (!err && user) {
        // Hash the password and compare it to the password stored:
        const hashedPassword = _helpers.hash(password);
        if(hashedPassword === user.hashedPassword) {
          // If valid, create a new token with a random name. Set expiration data 1 hour in the future:
          const id = _helpers.random.string(20);
          const expiration = Date.now() + 1000 * 60 * 60;
          const token = {phone, id, expiration};
          // Store the token:
          _editor.create("tokens", id, token, err => {
            !err ? callback(200, token) : callback(500, {"Error" : "Could not create the new token."})
          })
        } else { callback(500, {"Error": "Password did not match the specified user's."}) }
      } else { callback(400, {"Error" : "Could not find the specified user."}); }
    })
  } else { callback(400, {"Error" : "Missing required fields"}); }
}
// Tokens - GET
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  // Check the the id is valid:
  const id = data.query.id && data.query.id.trim().length === 20 ? data.query.id.trim() : false;
  if (id) {
    _editor.read("tokens", id, (err, token) => {
      !err && token ? callback(200, token) : callback(404);
    });
  } else { callback(400, {"Error": "Missing required field."}); }
}
// Tokens - PUT
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
// Check that all the required fields are filled out:
  const id = data.payload.id && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  const extend = data.payload.extend === true || false;
  if (id && extend) {
    // Make sure that the user doesn't already exist:
    _editor.read("tokens", id, (err, token) => {
      if (!err && token) {
        // Check if the token isn't already expired:
        if (token.expiration > Date.now()) {
          // Set the expiration an hour from now:
          token.expiration = Date.now() + 1000 * 60 * 60;
          // Store the updated token:
          _editor.update("tokens", id, token, err => {
            !err ? callback(200, token) : callback(500, {"Error": "Could not extend the expiration of the token."})
          });
        } else {callback(400, {"Error": "The token has already expired."});}
      } else { callback(400, {"Error": "Could not find the specified token."});}
    });
  } else { callback(400, {"Error" : "Missing required fields"}); }
}
// Tokens - DELETE
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // Check that the id is valid:
  const id = data.query.id && data.query.id.trim().length === 20 ? data.query.id.trim() : false;
  if (id) {
    _editor.read("tokens", id, (err, token) => {
      if (!err && token) {
        _editor.delete("tokens", id, err => {
          !err ? callback(200, {"Successfully deleted token" : token }) : callback(500, {"Error": "Could not delete the token"});
        });
      } else { callback(400, {"Error": "The specified token does not exist."}); }
    });
  } else { callback(400, {"Error": "Missing required field."}); }
}

// Verify if a give token is currently valid for a given user:
handlers._tokens.verify = (id, phone, callback) => {
  // Lookup the token;
  _editor.read("tokens", id, (err, token) => {
    if (!err && token) {
      // Check if the token is for the given user and has not expired.
      callback(token.phone === phone && token.expiration > Date.now());
    } else { callback(false); }
  })
}

// Checks handler:
handlers.checks = (data, callback) => {
  const accepted = ["POST", "GET", "PUT", "DELETE"];
  const method = data.method;
  accepted.includes(method.toUpperCase()) ? handlers._checks[method.toLowerCase()](data, callback) : callback(405);
}
// Container for all the tokens methods
handlers._checks = {};
// Checks - POST
// Required data: protocol, url, method, codes, timeout
// Optional data: none
handlers._checks.post = (data, callback) => {
  // Check that all the required fields are filled out:
  const {protocol, url, method, codes, timeout} = _helpers._checks.parse(data.payload);
  if (protocol && url && method && codes && timeout) {
    // Get the token from the headers:
    let id = data.headers.token || false;
    // Lookup the user by reading the token:
    _editor.read("tokens", id, (err, token) => {
      if (!err && token) {
        const phone = token.phone;
        // Lookup the user data:
        _editor.read("users", phone, (err, user) => {
          if (!err && user) {
            const checks = user.checks || [];
            // Verify that the user has less than the number of max checks per user:
            if (checks.length < ENV.maxChecks) {
              // Create a random ID for the check:
              id = _helpers.random.string(20);
              // Create the check object, and include the user's phone:
              const check = {id, phone, protocol, url, method, codes, timeout};
              // Save the object:
              _editor.create("checks", id, check, err => {
                if (!err) {
                  // Add the check ID to the user's object:
                  user.checks = checks;
                  user.checks.push(id);
                  // Save the user's data:
                  _editor.update("users", phone, user, err => {
                    // Return the data about the new check:
                    !err ? callback(200, check) : callback(500, {"Error": "Could not update the user with the new check."})
                  });
                } else { callback(500, {"Error" : "Could not create the new check."}); }
              });
            } else { callback(400, {"Error" : `The user already has the maximum number of checks (${ENV.maxChecks})`}); }
          } else { callback(403, {"Error": "Could not read the user."}); }
        });
      } else { callback(403, {"Error": "Could not read the token."}); }
    });
  } else { callback(400, {"Error" : "Missing required fields"}); }
}
// Checks - POST
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
  // Check that the phone number is valid:
  let id = data.query.id && data.query.id.trim().length === 20 ? data.query.id.trim() : false;
  if (id) {
    // Lookup the check:
    _editor.read("checks", id, (err, check) => {
      if (!err && check) {
        // Get the token from the headers:
        id = data.headers.token || false;
        // Verify that the given token is valid and belongs to the user who created the check:
        handlers._tokens.verify(id, check.phone, validity => {
          // Return the check data:
          validity ? callback(200, check) : callback(403, {"Error" : "Missing required token in header, or token is invalid."});
        });
      } else { callback(404); }
    });
  } else { callback(400, {"Error": "Missing required field."}); }
};
// Checks - PUT
// Required data: id
// Option data: protocol, url, method, codes, timeout (at least one must be specified)
handlers._checks.put = (data, callback) => {
  let id = data.payload.id && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  // Check for the optional fields:
  const {protocol, url, method, codes, timeout} = _helpers._checks.parse(data.payload);
  // Check to make sure the ID is valid and at least one optional field has been sent:
  if (id && (protocol || url || method || codes || timeout)) {
    // Lookup the check:
    _editor.read("checks", id, (err, check) => {
      if (!err && check) {
        // Get the token from the headers:
        id = data.headers.token || false;
        // Verify that the given token is valid and belongs to the user who created the check:
        handlers._tokens.verify(id, check.phone, validity => {
          if (validity) {
            // Update the check where necessary:
            protocol && (check.protocol = protocol);
            url && (check.url = url);
            method && (check.method = method);
            codes && (check.codes = codes);
            timeout && (check.timeout = timeout);
            // Store the updated check:
            _editor.update("checks", check.id, check, err => {
              !err ? callback(200, check) : callback(500, {"Error" : "Could not update the check."});
            })
          } else { callback(403, {"Error" : "Missing required token in header, or token is invalid."}); }
        });
      } else { callback(400, {"Error": "The specified check does not exist."})}
    });
  } else { callback(400, {"Error": "Missing required field or at least one optional field to update."})}
};
// Checks - DELETE
// Required data: id
// Option data: none
handlers._checks.delete = (data, callback) => {
  // Check that the id is valid:
  let id = data.query.id && data.query.id.trim().length === 20 ? data.query.id.trim() : false;
  if (id) {
    _editor.read("checks", id, (err, check) => {
      if (!err && check) {
        // Get the token from the headers:
        id = data.headers.token || false;
        handlers._tokens.verify(id, check.phone, validity => {
          if (validity) {
            // Delete the check:
            _editor.delete("checks", check.id, err => {
              if (!err) {
                _editor.read("users", check.phone, (err, user) => {
                  if (!err && user) {
                    // Remove the deleted check from the list of checks:
                    user.checks = user.checks.filter(id => id !== check.id);
                    // Save the user's data:
                    _editor.update("users", user.phone, user, err => {
                      !err ? callback(200, {check, user}) : callback(500, {"Error" : "Could not update the user."})
                    });
                  } else { callback(500, {"Error" : "Could not find the user related to the check."})}
                })
              } else { callback(500, {"Error" : "Could not delete the check."}); }
            })
          } else { callback(403, {"Error" : "Missing required token in header, or token is invalid."}); }
        });
      } else { callback(403, {"Error": "Could not find the specified check."}); }
    });
  } else { callback(400, {"Error": "Missing required field."}); }
}

// Exporte the module:
module.exports = handlers;
