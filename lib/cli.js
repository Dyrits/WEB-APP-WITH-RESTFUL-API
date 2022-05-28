// Dependencies:
const readLine = require("readline");
const util = require("util");
const debug = util.debuglog("cli");
const events = require("events");

class _events extends events{};

const event = new _events();

// Instantiate the CLI module object:
const cli = {};

// Input handlers:
event.on("man", function (input) { cli.responders.help(); });
event.on("help", function (input) { cli.responders.help(); });
event.on("exit", function (input) { cli.responders.exit(); });
event.on("stats", function (input) { cli.responders.stats(); });
event.on("list users", function (input) { cli.responders.listUsers(); });
event.on("more user info", function (input) { cli.responders.moreUserInfo(input); });
event.on("list checks", function (input) { cli.responders.listChecks(input); });
event.on("more check info", function (input) { cli.responders.moreCheckInfo(input); });
event.on("list logs", function (input) { cli.responders.listLogs(); });
event.on("more log info", function (input) { cli.responders.moreLogInfo(input); });

// Responders objects:
cli.responders = {};

// Help / Man:
cli.responders.help = function () {
    console.log("You asked for help.");
}

// Exit:
cli.responders.exit = function () { process.exit(0); }

// Stats:
cli.responders.stats = function () {
    console.log("You asked for stats.");
}

// List users:
cli.responders.listUsers = function () {
    console.log("You asked for list users.");
}

// More user info:
cli.responders.moreUserInfo = function (input) {
    console.log("You asked for more user info.");
}

// List checks:
cli.responders.listChecks = function (input) {
    console.log("You asked for list checks.");
}

// More check info:
cli.responders.moreCheckInfo = function (input) {
    console.log("You asked for more check info.");
}

// List logs:
cli.responders.listLogs = function () {
    console.log("You asked for list logs.");
}

// More log info:
cli.responders.moreLogInfo = function (input) {
    console.log("You asked for more log info.");
}

// Input processor:
cli.processInput = function (input) {
    input = input.trim().length && input.trim();
    // Only process the input if the user wrote something:
    if(input) {
        // Codify the command:
        const commands = [
            "man",
            "help",
            "exit",
            "stats",
            "list users",
            "more user info",
            "list checks",
            "more check info",
            "list logs",
            "more log info"
        ];
        // Check to see if the input is an existing command:
        let match = false;
        commands.some(function(command){
            if (command === input.toLowerCase()) {
                match = true;
                // Emit the corresponding event:
                event.emit(command, input);
                return true;
            }
        });
        // If no match is found, tell the user it is invalid:
        if (!match) { console.log("\x1b[31m%s\x1b[0m", "Sorry, that is an invalid command"); }
    }
}

// Initialization:
cli.init = function () {
    // Send the start message to the console in dark blue:
    console.log("\x1b[34m%s\x1b[0m", "The CLI is running.");
    // Start the interface:
    const interface = readLine.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "-#CLI#- "
    });
    // Create an initial prompt:
    interface.prompt();
    // Handle each line of input separately:
    interface.on("line", function(input){
        cli.processInput(input);
        // Re-initialize the prompt afterwards:
        interface.prompt();
    });
    // If the user stops the CLI, kill the associated process:
    interface.on("close", function(){ process.exit(0); });
}

// Export the module:
module.exports = cli;
