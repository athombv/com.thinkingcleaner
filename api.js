module.exports = [
	
	
	{
		description:	"Get status",
		method: 		'GET',
		path:			'/',
		fn: function( callback, args ){
			this.tc.getStatus( callback );
		}
	},
	
	
	{
		description:	"Start cleaning",
		method: 		'POST',
		path:			'/clean',
		fn: function( callback, args ){
			this.tc.clean( callback );
		}
	},
	
	
	{
		description:	"Stop cleaning",
		method: 		'POST',
		path:			'/stop',
		fn: function( callback, args ){
			this.tc.stop( callback );
		}
	},
	
	
	{
		description:	"Dock",
		method: 		'POST',
		path:			'/dock',
		fn: function( callback, args ){
			this.tc.dock( callback );
		}
	}
		
	
]