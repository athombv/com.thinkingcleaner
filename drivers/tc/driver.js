"use strict";

var request 	= require('request');
var mdns 		= require('mdns-js');

var browser;

var devices = {};

function init( devices, callback ) {

	//if you have another mdns daemon running, like avahi or bonjour, uncomment following line
	mdns.excludeInterface('0.0.0.0');
	
	// find the Thinking Cleaner device
	browser = mdns.createBrowser();
	
	// start discovery when ready
	browser.on('ready', function () {
		browser.discover();
	});
	
	// found an entry
	browser.on('update', function(device) {
				
		// check if it's a ThinkingCleaner
	    if( device.txt[0].indexOf('thinkingcleaner_uuid') === -1 ) return;
	    	    
		// parse the txt data
		// 'tc_data={"thinkingcleaner_uuid":"011d29348f8733ee","is_configured":true}' (String) -> 
		///			{"thinkingcleaner_uuid":"011d29348f8733ee","is_configured":true} (Object)
		var metadata = device.txt[0].substring(8);
			metadata = JSON.parse(metadata);
		
		var id = metadata.thinkingcleaner_uuid;
			
		// prevent duplicate devices (mdns sometimes fires twice)
		if( typeof devices[ id ] != 'undefined' ) return;
		
		var name = device.host;
			name = name.replace('.local', '');
	    		    
	    // add it to the list of cleaners
	    devices[ id ] = {
			id: id,
			name: name,
			ip: device.addresses[0]
	    }
	    	    
	    Homey.log('Found ThinkingCleaner', name, device.addresses[0] );
	    
	    setInterval(function(){
		    tc.getStatus( devices[ id ] );
	    }, 5000);

	});
	
	callback();
	
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
		if( typeof devices[id] == 'undefined' ) return new Error("device is not connected (yet)");
		return devices[id];
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
				Homey.manager('drivers').realtime('tc', {
					id: device.id
				}, 'state', state);
			}
			
		});
	},
	
	command: function( device, command, callback ){
		tc.api(device.ip, 'command.json?command=' + command, callback);
	}
	
}

var pair = {
	
	// get a list of all the found Thinking Cleaners
	list_devices: function( callback, emit, data ){		
		
		var devices_ = [];
		for( var device in devices ) {
			devices_.push({
				name: devices[ device ].name,
				data: {
					id: devices[ device ].id
				}
			})
		}				
		
		callback( devices_ );
	},
	
	add_device: function( callback, emit, data ){
		var device = devices[ data.data.id ];
		
		// play a sound on the roomba when paired :)
		tc.api( device.ip, 'command.json?command=find_me' );
	}
	
}

module.exports.init = init;
module.exports.pair = pair;

module.exports.capabilities = {
	
	state: {
		get: function( device, callback ){
			var device = tc.getDevice( device.id );
			if( device instanceof Error ) return callback( device );
	
			tc.getStatus( device, callback );		
		},
		set: function( device, state, callback ) {
			if( typeof state.cleaning 			!= 'undefined' ) module.exports.cleaning.set(		 device, state.cleaning		, function(){} );
			if( typeof state.spot_cleaning 		!= 'undefined' ) module.exports.spot_cleaning.set(	 device, state.spot_cleaning, function(){} );
			if( typeof state.docked 			!= 'undefined' ) module.exports.docked.set(			 device, state.docked		, function(){} );
			
			var device = tc.getDevice( device.id );
			if( device instanceof Error ) return callback( device );
	
			tc.getStatus( device, callback );	
		}
	},
	
	cleaning: {
		get: function( device, callback ){
			var device = tc.getDevice( device.id );
			if( device instanceof Error ) return callback( device );
			
			tc.getStatus( device, function(state){
				callback( state.cleaning );			
			});
			
		},
		set: function( device, value, callback ){
					
			var device = tc.getDevice( device.id );
			if( device instanceof Error ) return callback( device );
			
			// first, get the status
			tc.getStatus( device, function(state){
							
				// then, set the status (because clean simulates a button press, not really start/stop)
				if( (state.cleaning && value) || (!state.cleaning && !value) ) {
					callback( value );
				} else if( (state.cleaning && !value) || (!state.cleaning && value) ) {
					tc.command( device, 'clean', function(state){
						callback( value );
					});				
				}
			});
			
		}
	},

	spot_cleaning: {
		get: function( device, callback ){
			var device = tc.getDevice( device.id );
			if( device instanceof Error ) return callback( device );
			
			tc.getStatus( device, function(state){
				callback( state.spot_cleaning );			
			});
			
		},
		set: function( device, value, callback ) {
			// TODO
		}
	},
	
	docked: {
		get: function( device, callback ){
			var device = tc.getDevice( device.id );
			if( device instanceof Error ) return callback( device );
			
			tc.getStatus( device, function(state){
				callback( state.docked );			
			});
			
		},
		set: function( device, value, callback ) {
			// TODO
		}
	},
	
	charging: {
		get: function( device, callback ){
			var device = tc.getDevice( device.id );
			if( device instanceof Error ) return callback( device );
			
			tc.getStatus( device, function(state){
				callback( state.charging );			
			});
			
		}
	},

	battery_level: {
		get: function( device, callback ){
			var device = tc.getDevice( device.id );
			if( device instanceof Error ) return callback( device );
			
			tc.getStatus( device, function(state){
				callback( state.battery_level );			
			});
			
		}
	}
}