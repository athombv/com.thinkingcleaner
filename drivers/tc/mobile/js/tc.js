function onHomeyReady(){
		
	document.querySelector('.name').innerHTML = Homey.device.name;
	document.querySelector('.icon').style.webkitMaskImage = 'url(' + Homey.device.icon + ')';
		
	Homey.emit('state.get', null, function( state ){
		updateStatusGUI(state);
	});
	
	Homey.on('state', function( state ){
		updateStatusGUI(state);
	});
	
	document.getElementById('icon').addEventListener('click', function(){
		
		if( document.body.classList.contains('cleaning') ) {
			Homey.emit('vacuumcleaner.cleaning.set', false);
			document.body.classList.remove('cleaning');
		} else {
			Homey.emit('vacuumcleaner.cleaning.set', true);	
			document.body.classList.add('cleaning');		
		}
		
	});
	
}

var commands = {
	"st_base": 			"On homebase: Not Charging",
	"st_base_recon": 	"On homebase: Reconditioning Charging",
	"st_base_full": 	"On homebase: Full Charging",
	"st_base_trickle": 	"On homebase: Trickle Charging",
	"st_base_wait": 	"On homebase: Waiting",
	"st_plug": 			"Plugged in: Not Charging",
	"st_plug_recon": 	"Plugged in: Reconditioning Charging",
	"st_plug_full": 	"Plugged in: Full Charging",
	"st_plug_trickle": 	"Plugged in: Trickle Charging",
	"st_plug_wait": 	"Plugged in: Waiting",
	"st_stopped": 		"Stopped",
	"st_clean": 		"Cleaning",
	"st_cleanstop": 	"Stopped with cleaning",
	"st_clean_spot": 	"Spot cleaning",
	"st_clean_max": 	"Max cleaning",
	"st_delayed": 		"Delayed cleaning will start soon ..",
	"st_dock": 			"Searching Homebase",
	"st_pickup": 		"Roomba picked up",
	"st_remote": 		"Remote control driving",
	"st_wait": 			"Waiting for command",
	"st_off ": 			"Off"
}

function updateStatusGUI( state ) {
		
	// state
	var stateEl = document.getElementById('state-text');
	stateEl.innerHTML = commands[ state.cleaner_state ];
	
	// battery
	var batteryPercentageEl = document.getElementById('battery-percentage');
	var batteryIconEl = document.getElementById('battery-icon');
	var batteryIconChargingEl = document.getElementById('battery-icon-charge');
	
	batteryPercentageEl.innerHTML = state.battery_charge + '%';
	batteryIconChargingEl.style.height = ( state.battery_charge + '%' );
	
	if( state.cleaner_state.substring(0,7) == 'st_base' || state.cleaner_state.substring(0,7) == 'st_plug' ) {
		batteryIconEl.classList.add('charging');
	} else {
		batteryIconEl.classList.remove('charging');
	}
	
	// icon
	var iconEl = document.getElementById('icon');
	if( state.cleaning ) {
		iconEl.classList.add('cleaning');
	} else {
		iconEl.classList.remove('cleaning');
	}
}