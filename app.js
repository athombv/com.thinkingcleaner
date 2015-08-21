"use strict";

module.exports = self = {

	init: function(){
		
		// flow:condition:cleaning
		Homey.manager('flow').on('condition.cleaning', function( args, callback ){
			if( typeof args.device == 'undefined' ) return;
			var driver = Homey.manager('drivers').getDriver( args.device.driver.id );
				driver.capabilities.cleaning.get( args.device.data, callback );
		});
		
		// flow:condition:docked
		Homey.manager('flow').on('condition.docked', function( args, callback ){
			if( typeof args.device == 'undefined' ) return;
			var driver = Homey.manager('drivers').getDriver( args.device.driver.id );
				driver.capabilities.docked.get( args.device.data, callback );
		});
		
		// flow:action:start
		Homey.manager('flow').on('action.clean', function( args, callback ){
			if( typeof args.device == 'undefined' ) return;
			var driver = Homey.manager('drivers').getDriver( args.device.driver.id );
				driver.capabilities.cleaning.set( args.device.data, true, callback );
		});
		
		// flow:action:pause
		Homey.manager('flow').on('action.pause', function( args, callback ){
			if( typeof args.device == 'undefined' ) return;
			var driver = Homey.manager('drivers').getDriver( args.device.driver.id );
				driver.capabilities.cleaning.set( args.device.data, false, callback );
		});
		
		// flow:action:dock
		Homey.manager('flow').on('action.dock', function( args, callback ){
			if( typeof args.device == 'undefined' ) return;
			var driver = Homey.manager('drivers').getDriver( args.device.driver.id );
				driver.capabilities.docked.set( args.device.data, true, callback );
		});
		
	}
	
}