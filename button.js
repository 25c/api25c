//
// 25c Button Messaging/Routing Process
//
// Author: Sylvio Drouin
// 
// Version : 1.0
//
// Date : May 7th 2012
//
// (C) Copyright 2012 25c inc. 
//
//

var http = require('http');
var redis = require("redis");
	 
var channelName = '25c_mode_debug';

var REDIS_URL = 'localhost';
var REDIS_PORT = 6379;

// create a redis connection
try
{	
	if (process.env.REDISTOGO_URL) {

		var rtg   = require("url").parse(process.env.REDISTOGO_URL);
		var redis = require("redis").createClient(rtg.port, rtg.hostname);

		redis.auth(rtg.auth.split(":")[1]);
	
	} else {
	  	var redis = require("redis").createClient();
	}
}

catch (err)
{
	console.log( "ERROR => Cannot connect to Redis message broker: URL => " + rtg.hostname + "; Port => " + rtg.port );
	console.log(err);
}
	 
var express = require('express');

var app = express.createServer(express.logger());

app.all('/donate/:user_id/:recipient_id', function(req, res, next){
  req.user_id = req.params.user_id;
  req.recipient_id = req.params.recipient_id;
  next();
});

app.get('/donate/:user_id/:recipient_id', function(req, res){
  	debug_key = "25c_debug_key";
	generated_key = "7473498839"; // generate using other algorithm soon
	
	res.send('user '+req.user_id + ' donate to recipient ' + req.recipient_id + '    || Key published to REDIS : '+ req.user_id + ':' + 
						req.recipient_id + ':' + debug_key + ':' + generated_key);
	// post the message to the redis message broker
	// here we gonna process the message
	// validate user ID and donation ID and any other data we need
	// format a REDIS message and push into the DB
	redisClient.publish(channelName, req.user_id + ':' + 
						req.recipient_id + ':' + debug_key + ':' + generated_key);
//	res.writeHead(404);
//	res.end();
});

app.get('*', function(req, res){
  res.send('unrecognized request at 25c', 404);
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});





