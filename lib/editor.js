/*
Library for storing and editing data.
 */

// Dependencies:
const FS = require("fs");
const PATH = require("path");

// Local dependencies:
const _helpers = require("./helpers");

// Container for the module (to be exported):
const editor = {};

// Base directory of the data folder:
editor.base = PATH.join(__dirname, "/../.data/");

editor.path = (directory, file = null) => {
    file = file ? `${file}.json` : String();
    return `${editor.base}${directory}/${file}`;
}

// Write data to a file
editor.create = (directory, file, data, callback) => {
  // Open the file for writing:
  FS.open(editor.path(directory, file), "wx", (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        // Convert data to string and...
        // ...write to the file and close it:
        FS.writeFile(fileDescriptor, JSON.stringify(data), err => {
          !err ? FS.close(fileDescriptor, err => {
              !err ? callback(false) : callback("Error while closing the file.");
          }) : callback("Error while writing to the file.")
        })
      } else { callback("Could not create a new file. It may already exist.") }
    });
}


// Read data from a file:
editor.read = (directory, file, callback) => {
  FS.readFile(editor.path(directory, file), "utf8", (err, data) => {
      callback(err, _helpers.JSON.parse(data))
    });
}

// Update data inside a file:
editor.update = (directory, file, data, callback) => {
  // Open the file for writting:
  FS.open(editor.path(directory, file), "r+", (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        // Truncate the file:
        FS.ftruncate(fileDescriptor, err => {
          !err ? FS.writeFile(fileDescriptor, JSON.stringify(data), err => {
            !err ? FS.close(fileDescriptor, err => {
              !err ? callback(false) : callback("Error while closing the file.");
            }) : callback("Error writing to the existing file.");
          }) : callback("Error truncating file.");
        })
      } else { callback("Could not open the file for updating. It may not exist yet."); }
    })
}

// Delete a file:
editor.delete = (directory, file, callback) => {
  // Unlink the file:
  FS.unlink(editor.path(directory, file), err => { callback(err); })
}

// List all the files in a directory:
editor.list = (directory, callback) => {
    FS.readdir(editor.path(directory), (err, data) => {
        if (!err && data && data.length) {
            const filesNames = [];
            data.forEach(file => { filesNames.push(file.replace(".json", String())); });
            callback(false, filesNames);
        } else { callback(err, data); }
    })
}

// Export the module:
module.exports = editor;
