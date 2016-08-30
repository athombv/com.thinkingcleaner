"use strict";

const mdns = require('mdns-js');
const request = require('request');
const ThinkingCleaner = require('node-thinking-cleaner');

var devices = [];
var temp_devices = [];
var discoveryDebouncer;

module.exports.init = function (devices_data, callback) {

	// Set all devices unavailable
	for (let x in devices_data) {
		module.exports.setUnavailable(devices_data[x], "Offline");
	}

	// Start discovery
	discover().then(results => {
		for (let i in results) {

			// Check if pre-installed
			let preInstalled = false;
			for (let x in devices_data) {
				if (devices_data[x].id === results[i].data.id) preInstalled = true;
			}

			// If valid and not added and already installed
			if (!getDevice(results[i].id) && preInstalled) {

				// Add it
				devices.push(results[i]);

				// Mark as available
				module.exports.setAvailable(results[i].data);

				// Listen for events from device
				listenForEvents(results[i]);
			}
		}

		callback();
	});

	// Start listening for flow events
	initFlows();
};

module.exports.pair = function (socket) {

	socket.on('list_devices', function (data, callback) {

		discover().then(devices => {
			let result = [];

			for (let i in devices) {

				// Check if already found
				let already_found = false;
				for (let j in temp_devices) {
					if (temp_devices[j].data.id === devices[i].data.id) already_found = true;
				}
				if (!already_found) temp_devices.push(devices[i]);

				// Push result
				result.push({
					name: devices[i].name,
					data: {
						id: devices[i].data.id
					}
				});
			}

			// Callback with result
			callback(null, result);
		});
	});

	socket.on("disconnected", function () {
		temp_devices = [];
	})
};

let stateDebouncer = null;
module.exports.capabilities = {

	vacuumcleaner_state: {

		get: function (device_data, callback) {
			if (!device_data) return new Error("invalid_device");
			let device = getDevice(device_data.id);
			if (device && device.api && device.api.cleaner_state) {
				callback(null, device.api.cleaner_state || 'stopped');
			}
			else {
				callback(true, false);
			}
		},

		set: function (device_data, command, callback) {
			if (!device_data) return new Error("invalid_device");
			var device = getDevice(device_data.id);

			console.log('set vacuumcleaner_state:');
			console.log(command);
			if (device) {
				if (stateDebouncer) {
					clearTimeout(stateDebouncer);
					stateDebouncer = null;
				}
				switch (command) {
					case "cleaning":
						stateDebouncer = setTimeout(() => {
							console.log('start cleaning');
							device.api.startCleaning().then(() => {
								callback(null, true);
							}).catch(() => {
								callback(true, false);
							});
						}, 2000);
						break;
					case "spot_cleaning":
						stateDebouncer = setTimeout(() => {
							console.log('start spot cleaning');
							device.api.startSpotCleaning().then(() => {
								callback(null, true);
							}).catch(() => {
								callback(true, false);
							});
						}, 2000);

						break;
					case "stopped":
						stateDebouncer = setTimeout(() => {
							console.log('stop cleaning');
							device.api.stopCleaning().then(() => {
								callback(null, true);
							}).catch(() => {
								callback(true, false);
							});
						}, 2000);

						break;
					case "docked":
						stateDebouncer = setTimeout(() => {
							console.log('go to dock');
							device.api.goToDock().then(() => {
								callback(null, true);
							}).catch(() => {
								callback(true, false);
							});
						}, 2000);

						break;
					case "charging":
						stateDebouncer = setTimeout(() => {
							console.log('go to dock (charging)');
							device.api.goToDock().then(() => {
								callback(null, true);
							}).catch(() => {
								callback(true, false);
							});
						}, 2000);
						break;
				}
			}
			else {
				callback(true, false);
			}
		}
	},

	measure_battery: {

		get: function (device_data, callback) {
			if (!device_data) return new Error("invalid_device");
			let device = getDevice(device_data.id);
			if (device) {
				callback(null, device.api.battery_charge);
			}
			else {
				callback(true, false);
			}
		}
	}
};

/**
 * Handle deleted devices
 * @param device_data
 */
module.exports.deleted = function (device_data) {

	// Remove device from internal list
	devices = devices.filter(function (x) {
		return x.data.id != device_data.id;
	});
};

/**
 * Handle added devices
 * @param device_data
 */
module.exports.added = function (device_data) {

	// Get device
	let device = getDevice(device_data.id, temp_devices);

	// Listen for events from device
	listenForEvents(device);

	// Add device from temp
	devices.push(device);
};

/**
 * Starts to listen on the events being
 * emitted by the device, handles realtime
 * updates and availability.
 * @param device
 */
function listenForEvents(device) {
	if (device && device.api) {

		device.api.on("battery_charge", battery_charge => {

			console.log("TC: emit realtime measure_battery change: " + battery_charge);

			// Emit realtime event
			module.exports.realtime(device.data, "measure_battery", battery_charge);

		}).on("cleaner_state", state => {

			console.log("TC: emit realtime vacuumcleaner_state change: " + state);

			// Emit realtime
			module.exports.realtime(device.data, "vacuumcleaner_state", state);

		}).on("started_cleaning", () => {

			console.log("TC: trigger started_cleaning flow");

			// Trigger flow
			Homey.manager("flow").triggerDevice('started_cleaning', {}, {}, device.data, function (err, result) {
				if (err) return Homey.error(err);
			});
		}).on("unavailable", () => {

			// Emit realtime
			module.exports.setUnavailable(device.data, "Offline");

			// Check if already discovering
			if (discoveryDebouncer) return;

			discoveryDebouncer = setTimeout(() => {

				discover().then(results => {
					for (let i in results) {


						// If valid and not added and already installed
						if (device.data.id === results[i].data.id) {

							for (let j in devices) {
								if (device.data.id === devices[i].data.id) {
									devices.splice(i, 1);
								}
							}

							// Add updated device
							devices.push(results[i]);

							// Mark as available
							module.exports.setAvailable(results[i].data);

							// Listen for events from device
							listenForEvents(results[i]);
						}
					}
				});
			}, 500);

		}).on("available", () => {

			// Emit realtime
			module.exports.setAvailable(device.data);
		});
	}
}

/**
 * Start listening on incoming flow events.
 */
function initFlows() {

	Homey.manager('flow').on('condition.cleaning', function (callback, args) {

		// Double check given args
		if (args.device_data) {

			var device = getDevice(args.device_data.id);
			if (device) {

				callback(null, device.api.cleaning)
			}
			else {
				callback(true, false);
			}
		}
	});

	Homey.manager('flow').on('condition.docked', function (callback, args) {

		// Double check given args
		if (args.device_data) {

			var device = getDevice(args.device_data.id);
			if (device) {

				callback(null, device.api.docked)
			}
			else {
				callback(true, false);
			}
		}
	});

	Homey.manager('flow').on('condition.battery_low', function (callback, args) {

		// Double check given args
		if (args.device_data) {

			var device = getDevice(args.device_data.id);
			if (device) {

				callback(null, (device.api.battery_charge <= 10))
			}
			else {
				callback(true, false);
			}
		}
	});

	Homey.manager('flow').on('action.clean', function (callback, args) {

		// Double check given args
		if (args.device_data) {

			var device = getDevice(args.device_data.id);
			if (device) {
				device.api.startCleaning().then(() => {
					callback(null, true);
				}).catch(() => {
					callback(true, false);
				});
			}
			else {
				callback(true, false);
			}
		}
	});

	Homey.manager('flow').on('action.pause', function (callback, args) {

		// Double check given args
		if (args.device_data) {

			var device = getDevice(args.device_data.id);
			if (device) {
				device.api.stopCleaning().then(() => {
					callback(null, true);
				}).catch(() => {
					callback(true, false);
				});
			}
			else {
				callback(true, false);
			}
		}
	});

	Homey.manager('flow').on('action.dock', function (callback, args) {

		// Double check given args
		if (args.device_data) {
			var device = getDevice(args.device_data.id);
			if (device) {
				device.api.stopCleaning().then(() => {
					setTimeout(() => {
						device.api.goToDock().then(() => {
							callback(null, true);
						}).catch(() => {
							callback(true, false);
						});
					}, 1500);
				}).catch(() => {
					callback(true, false);
				});
			}
			else {
				callback(true, false);
			}
		}
	});

	Homey.manager('flow').on('action.spot', function (callback, args) {

		// Double check given args
		if (args.device_data) {

			var device = getDevice(args.device_data.id);
			if (device) {
				device.api.startSpotCleaning().then(() => {
					callback(null, true);
				}).catch(() => {
					callback(true, false);
				});
			}
			else {
				callback(true, false);
			}
		}
	});
}

/**
 * Do device discovery through API
 * @returns {Promise}
 */
function discover() {
	return new Promise((resolve, reject) => {

		// Make request
		request("http://thinkingsync.com/api/v1/discover/devices", { timeout: 5000 }, function (error, response, body) {
			if (error) return reject(error);

			// Parse response
			let devices = JSON.parse(body);

			let result = [];

			// If data is present
			if (devices) {

				// Loop the devices
				for (let i in devices) {

					// Create TC object
					let tc = {
						name: devices[i].name,
						data: {
							id: devices[i].uuid
						},
						api: new ThinkingCleaner({
							name: devices[i].name,
							id: devices[i].uuid,
							ip: devices[i].local_ip,
							polling: true
						})
					};

					// Push result on stack
					result.push(tc);
				}
			}

			// Done, resolve with result
			resolve(result);
		});
	});
}

/**
 * Get device from the devices list,
 * if provided it will search a different
 * list.
 * @param id
 * @param list
 * @returns {*}
 */
function getDevice(id, list) {
	let search_list = list || devices;
	for (let x in search_list) {
		if (search_list[x].data.id === id) {
			return search_list[x];
		}
	}
}
