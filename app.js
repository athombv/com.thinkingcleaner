"use strict";

var self = module.exports = {

	init: function()
	{
		self.cleaners = {};

		// flow:condition:cleaning
		Homey.manager('flow').on('condition.cleaning', function( callback, args )
		{
			if( typeof self.cleaners[ args.device.id ] == 'undefined' ) return;

			var driver = Homey.manager('drivers').getDriver('tc');
			driver.capabilities.vacuumcleaner_state.get( args.device.id, "cleaning", callback );
		});

		// flow:condition:battery_low
		Homey.manager('flow').on('condition.battery_low', function( callback, args )
		{
			if( typeof self.cleaners[ args.device.id ] == 'undefined' ) return;

			var driver = Homey.manager('drivers').getDriver('tc');
			driver.capabilities.measure_battery.get( args.device.id, "Battery is low", callback );
		});

		// flow:condition:docked
		Homey.manager('flow').on('condition.docked', function( callback, args )
		{
			if( typeof self.cleaners[ args.device.id ] == 'undefined' ) return;

			var driver = Homey.manager('drivers').getDriver('tc');
			driver.capabilities.vacuumcleaner_state.get( args.device.id, "docked", callback );	
		});

		// flow:action:start
		Homey.manager('flow').on('action.clean', function( callback, args )
		{
			if( typeof self.cleaners[ args.device.id ] == 'undefined' ) return;

			var driver = Homey.manager('drivers').getDriver('tc');
			driver.capabilities.vacuumcleaner_state.set( args.device.id , 'cleaning', callback );
		});

		// flow:action:pause
		Homey.manager('flow').on('action.pause', function( callback, args )
		{
			if( typeof self.cleaners[ args.device.id ] == 'undefined' ) return;

			var driver = Homey.manager('drivers').getDriver('tc');
			driver.capabilities.vacuumcleaner_state.set( args.device.id , 'pause', callback );
		});

		// flow:action:dock
		Homey.manager('flow').on('action.dock', function( callback, args )
		{
			if( typeof self.cleaners[ args.device.id ] == 'undefined' ) return;

			var driver = Homey.manager('drivers').getDriver('tc');
			driver.capabilities.vacuumcleaner_state.set( args.device.id , 'docking', callback );
		});

		// flow:action:spot
		Homey.manager('flow').on('action.spot', function(callback, args)
		{
			if( typeof self.cleaners[ args.device.id ] == 'undefined' ) return;

			var driver = Homey.manager('drivers').getDriver('tc');
			driver.capabilities.vacuumcleaner_state.set( args.device.id , 'spot', callback );
		});		
	}
}
