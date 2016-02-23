"use strict";

var request 	= require('request');
var mdns 	= require('mdns-js');

var browser;

//var cleaners = {};

function init( devices, callback ) {

	//if you have another mdns daemon running, like avahi or bonjour, uncomment following line
	mdns.excludeInterface('0.0.0.0');
	
	// find the Thinking Cleaner device
	browser = mdns.createBrowser();
	
	// start discovery when ready
	browser.on('ready', function () {
		browser.discover();
		callback();
	});
	
	// found an entry
	browser.on('update', function(cleaner)
	{		
	    // check if it's a ThinkingCleaner
	    if( cleaner.txt[0].indexOf('thinkingcleaner_uuid') === -1 ) return;
	    	    
		// parse the txt data
		// 'tc_data={"thinkingcleaner_uuid":"011d29348f8733ee","is_configured":true}' (String) -> 
		///			{"thinkingcleaner_uuid":"011d29348f8733ee","is_configured":true} (Object)
		var metadata = cleaner.txt[0].substring(8);
		       metadata = JSON.parse(metadata);
		
		var id = metadata.thinkingcleaner_uuid;
			
		// prevent duplicate devices (mdns sometimes fires twice)
		if( typeof Homey.app.cleaners[ id ] != 'undefined' ) return;
		
		var name = cleaner.host;
			name = name.replace('.local', '');
	    		    
	    // add it to the list of cleaners
	    Homey.app.cleaners[ id ] = {
			id: id,
			name: name,
			ip: cleaner.addresses[0]
	    }
	    
	    // check if this cleaner is already paired
	    devices.forEach(function(device)
	    {
		    if( device.id == id )
		    {
			    setInterval(function()
			    {
				    tc.getStatus( Homey.app.cleaners[ id ] );
			    }, 5000);			    
		    }
	    });
	});
	
}

var tc = {
	statusCache: {},
	
	api: function( ip, path, callback ) {
		request({
			url: 'http://' + ip + '/' + path,
			json: true
		}, function( err, httpResponse, body){
			if( err ) return false;
			if( typeof callback == 'function' ) callback(body);
		});		
	},
	
	getDevice: function( id ) {
		if( typeof Homey.app.cleaners[id] == 'undefined' ) return new Error("device is not connected (yet)");
		return Homey.app.cleaners[id];
	},
	
	getStatus: function( device, callback ){
		tc.api(device.ip, 'status.json', function( result ){
						
			// replace string ints with booleans
			for( var key in result.status ) {
				if( result.status[key] === '0' ) result.status[key] = false;
				if( result.status[key] === '1' ) result.status[key] = true;
			}
			
			// generate the state object						
			var state = {
				cleaning		: result.status['cleaning'],
				spot_cleaning	: result.status['cleaner_state'] == 'st_clean_spot',
				docked			: result.status['cleaner_state'].substr(0,7) == 'st_base',
				charging		: result.status['cleaner_state'] == 'st_base_recon'
					|| result.status['cleaner_state'] == 'st_base_full'
					|| result.status['cleaner_state'] == 'st_base_trickle',
				battery_level	: result.status.battery_charge
			}
						
			// perform callback
			if( typeof callback == 'function' ) {
				callback( state );
			}
						
			// emit realtime event if something has changed
			if( typeof tc.statusCache[ device.id ] == 'undefined' ) {
				tc.statusCache[ device.id ] = JSON.stringify(state);
			}
			
			if( JSON.stringify( result.status ) != tc.statusCache[ device.id ] ) {
				tc.statusCache[ device.id ] = JSON.stringify(state);
				module.exports.realtime({
					id: device.id
				}, 'state', state);
			}
			
		});
	},
	
	command: function( device, command, callback ){
		tc.api(device.ip, 'command.json?command=' + command, callback);
	}
	
};

var pair = function(socket)
{
	// this method is run when Homey.emit('start') is run on the front-end
	socket.on('start', function( data, callback ) {

	// fire the callback (you can only do this once)
	// ( err, result )
	callback( null, 'Started!' );

	// send a message to the front-end, even after the callback has fired
	setTimeout(function(){
	    socket.emit("hello", "Hello to you!", function( err, result ){
	        console.log( result ); // result is `Hi!`
	    });
	}, 2000);

	});

	// get a list of all the found Thinking Cleaners
	socket.on('list_devices', function( data, callback )
	{
		var devices = [];
		for( var cleaner in Homey.app.cleaners )
		{
			devices.push({
				name: Homey.app.cleaners[ cleaner ].name,
				data: {
					id: Homey.app.cleaners[ cleaner ].id
				}
			});
		}	
		
		callback( null, devices );
	});
	
	//the trigger does not work? Is this updated?
	socket.on('add_devices', function( data, callback )
	{
		var device = Homey.app.cleaners[ data.device.id ];
		
		// play a sound on the roomba when paired :)
		tc.api( device.ip, 'command.json?command=find_me' );
	});

	socket.on('disconnect', function()
	{
		console.log("User aborted pairing, or pairing is finished");
	});
};

module.exports.init = init;
module.exports.pair = pair;

module.exports.capabilities = {
	vacuumcleaner_state: {
		get: function( device_id, command, callback )
		{
			var device = tc.getDevice(device_id);
			if( device instanceof Error ) return callback( device );
			
			tc.getStatus( device, function(state)
			{
				switch(command)
				{
					case "cleaning":
						return callback(null, state.cleaning);
					case "docked":
						return callback(null, state.docked);
					case "spot":
						return callback(null, state.spot);
					case "charging":
						return callback(null, state.charging);
				}
			});
			
		},
		set: function( device_id, command, callback )
		{
			var device = tc.getDevice(device_id);
			if( device instanceof Error ) return callback( device );

			// first, get the status
			tc.getStatus( device, function(state)
			{
				switch(command)
				{
					case "cleaning":
						if(state.cleaning)
							return callback(state.cleaning);

						tc.command( device, 'clean', function(state)
						{
							callback( null, true );
						});
					break;

					case "pause":
						if(!state.cleaning)
							return callback( state.cleaning );

						tc.command( device, 'clean', function(state)
						{
							callback( null, true );
						});
					break;

					case "docking":
						tc.command( device, 'dock', function(state)
						{
							callback( null, true );
						});
					break;	

					case "spot":
						tc.command( device, 'spot', function(state)
						{
							callback( null, true );
						});
					break;										
				}
			});
			
		}
	},
	
	measure_battery: {
		get: function( device_id, command, callback )
		{
			var device = tc.getDevice( device_id );
			if( device instanceof Error ) return callback( device );

			switch(command)
			{
				case "Battery is low":			
					tc.getStatus( device, function(state)
					{
						if(state.battery_level == 0)
							return callback(null, false);

						if(state.battery_level < 10)
						{
							return callback( null, true );
						}

						return callback( null, false );
					});
				break;
			}	
		}
	}
}