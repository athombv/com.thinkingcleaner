var state = {
	measure_battery: 0,
	vacuumcleaner_state: {
		cleaning: false,
		spot_cleaning: false,
		docked: false,
		charging: false
	}
}

function onHomeyReady(){
		
	document.querySelector('.name').innerHTML = Homey.device.name;
	document.querySelector('.icon').style.webkitMaskImage = 'url(' + Homey.device.icon + ')';
	
	Homey.device.capabilities.forEach(function(capability){	
		Homey.get(capability, function( value ){
			state[ capability ] = value;
			updateStatusGUI();
		});
		
		Homey.on(capability, function( value ){
			state[ capability ] = value;
			updateStatusGUI();
		});
	});
	
	document.getElementById('icon').addEventListener('click', function(){
		
		document.body.classList.toggle('cleaning');
		
		Homey.set('vacuumcleaner_state', {
			cleaning: document.body.classList.contains('cleaning')
		});
		
	});
	
}

function updateStatusGUI() {
		
	// state
	var stateEl = document.getElementById('status');
	
	stateEl.innerHTML = 'Idle...';
	
	if( state.vacuumcleaner_state.cleaning )
		stateEl.innerHTML = 'Cleaning...';
		
	if( state.vacuumcleaner_state.spot_cleaning ) 
		stateEl.innerHTML = 'Spot cleaning...';
		
	if( state.vacuumcleaner_state.docked ) 
		stateEl.innerHTML = 'Docked';
		
	if( state.vacuumcleaner_state.charging ) 
		stateEl.innerHTML = 'Charging...';
		
	if( state.vacuumcleaner_state.stopped ) 
		stateEl.innerHTML = 'Stopped';
		
	if( state.vacuumcleaner_state.charging && state.vacuumcleaner_state.docked ) 
		stateEl.innerHTML = 'Docked & Charging...';
	
	// battery
	var batteryPercentageEl 	= document.getElementById('battery-percentage');
		batteryPercentageEl.innerHTML = (state.measure_battery * 100) + '%';
		
	var batteryIconChargingEl 	= document.getElementById('battery-icon-charge');
		batteryIconChargingEl.style.height = (state.measure_battery * 100) + '%';
	
	var batteryIconEl 			= document.getElementById('battery-icon');
		batteryIconEl.classList.toggle('charging', state.vacuumcleaner_state.charging);
	
	// icon
	document.body.classList.toggle('cleaning', state.vacuumcleaner_state.cleaning || state.vacuumcleaner_state.spot_cleaning);
}