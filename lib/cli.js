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

// Responders object:
cli.responders = {};

// Display object:
cli.display = {};

// Create a vertical space:
cli.display.lineBreak = function (count = 1) {
    console.log("\n".repeat(count - 1));
}

// Create an horizontal line across the screen:
cli.display.horizontalLine = function () {
    // Get the available screen size:
    const width = process.stdout.columns;
    const line = "-".repeat(width);
    console.log(line);
}

// Create centered text on the screen:
cli.display.centered = function (text) {
    // Get the number of characters in the string:
    const width = process.stdout.columns;
    const leftPadding = Math.floor((width - text.length) / 2);
    const rightPadding = width - (leftPadding + text.length);
    console.log(" ".repeat(leftPadding) + text + " ".repeat(rightPadding));
}

// Help / Man:
cli.responders.help = function () {
    const commands = {
        "exit": "Kill the CLI (and the rest of the application).",
        "man": "Get information about the commands available.",
        "help": "Get information about the commands available.",
        "stats": "Get statistics on the underlying operating system and resource utilisation.",
        "list users": "Get a list of all the registered users.",
        "more user info --{userId}": "Get details of a specific user.",
        "list checks --up --down": "Get a list of all the active checks in the system, including their state. The --up and --down flags can be used to filter the results.",
        "more check info --{checkId}": "Get details of a specific check.",
        "list logs": "Get a list of all the log files (compressed and uncompressed).",
        "more log info --{fileName}": "Get details of a specific log file."
    };
    // Show a header for the help page that is as wide as the screen:
    cli.display.horizontalLine();
    cli.display.centered("CLI MANUAL");
    cli.display.horizontalLine();
    cli.display.lineBreak();
    // Show each command, followed by its explanation:
    for (const [key, value] of Object.entries(commands)) {
        let line = `\x1b[33m${key}\x1b[0m`;
        const padding = 60 - line.length;
        line += " ".repeat(padding);
        console.log(line + value);
        cli.display.lineBreak();
    }
    cli.display.horizontalLine();
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
