function onHomeyReady(){
		
	document.querySelector('.name').innerHTML = Homey.device.name;
	document.querySelector('.icon').style.webkitMaskImage = 'url(' + Homey.device.icon + ')';
		
	Homey.get('state', function(state){
		updateStatusGUI(state);
	})	
	
	Homey.on('state', function( state ){
		updateStatusGUI(state);
	});
	
	document.getElementById('icon').addEventListener('click', function(){
		
		if( document.body.classList.contains('cleaning') ) {
			Homey.set('cleaning', false);
			document.body.classList.remove('cleaning');
		} else {
			Homey.set('cleaning', true);
			document.body.classList.add('cleaning');		
		}
		
	});
	
}

function updateStatusGUI( state ) {
		
	// state
	var stateEl = document.getElementById('state-text');
	
	stateEl.innerHTML = 'Idle...';
	if( state.cleaning )
		stateEl.innerHTML = 'Cleaning...';
	if( state.spot ) 
		stateEl.innerHTML = 'Spot cleaning...';
	if( state.docked ) 
		stateEl.innerHTML = 'Docked';
	if( state.charging ) 
		stateEl.innerHTML = 'Charging...';
	if( state.charging && state.docked ) 
		stateEl.innerHTML = 'Docked & Charging...';
	
	// battery
	var batteryPercentageEl 	= document.getElementById('battery-percentage');
		batteryPercentageEl.innerHTML = state.battery_level + '%';
		
	var batteryIconChargingEl 	= document.getElementById('battery-icon-charge');
		batteryIconChargingEl.style.height = ( state.battery_level + '%' );
	
	var batteryIconEl 			= document.getElementById('battery-icon');
		batteryIconEl.classList.toggle('charging', state.charging);
	
	// icon
	var iconEl = document.getElementById('icon');
		iconEl.classList.toggle('cleaning', state.cleaning || state.spot_cleaning);
}