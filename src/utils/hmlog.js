var consoleLogging = false;

const setHmLogging = function(on) {
	consoleLogging = on;
}

const hmLog = function(message) {
	if (consoleLogging != true) return;
	console.log("[HMLOG] - " + message);
}

module.exports = { setHmLogging, hmLog }
