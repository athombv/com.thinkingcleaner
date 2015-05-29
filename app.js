"use strict";

function App() 
{
	
}

module.exports = App;

App.prototype.init = function(){
	
}

App.prototype.events = {};
App.prototype.events.flow = {}
App.prototype.events.flow.conditions = {}
App.prototype.events.flow.conditions.cleaning = function( callback, args ){	
	
	this.tc.getStatus(function( result ){
		callback( result.cleaning === "1" );
	});
	
};
App.prototype.events.flow.conditions.docked = function( callback, args ){	
	
	this.tc.getStatus(function( result ){
		callback( result.cleaner_state.substring(0,7) == 'st_base' );
	});
	
};
App.prototype.events.flow.actions = {};
App.prototype.events.flow.actions.clean = function( callback, args ){	
	this.tc.clean();	
};
App.prototype.events.flow.actions.stop = function( callback, args ){	
	this.tc.stop();	
};
App.prototype.events.flow.actions.dock = function( callback, args ){	
	this.tc.dock();	
};