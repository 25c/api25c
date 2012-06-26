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
	 
var QUEUE_KEY = 'QUEUE';
var RAILS_COOKIE_SECRET = 'b802e05c5c52308aef8554ae04b329dfe513a8018fc82f8d11e24572f58d38c8075822788567089906c19f4620cd51227802cca0c10c2204851c4109f7ff5173';
var NODE_COOKIE_SECRET = '9bcc9f49beb2dcb03cb20c01117431fd33cb4f0c64825ad78dd841948072642023e1869392988c77a4d62c20dd43229649e2d045b06f67b04d2cde3f058ac33e';
var NODE_COOKIE_SESSION_KEY = '_api25c_session'

var http = require('http');
var redis = require('redis');
var rails = require('./rails');
var url = require('url');
var uuid = require('node-uuid');
var pg = require('pg').native;

var redisDataClient;
var redisWebClient;
var redisApiClient;
var redisURL;
try 
{	
	if (process.env.REDISTOGO_URL) {
		redisURL = url.parse(process.env.REDISTOGO_URL);
		redisApiClient = redis.createClient(redisURL.port,redisURL.hostname);
		redisApiClient.auth(redisURL.auth.split(":")[1]);
		
		redisURL = url.parse(process.env.REDISTOGO_WEB_URL);
		redisWebClient = redis.createClient(redisURL.port,redisURL.hostname);
		redisWebClient.auth(redisURL.auth.split(":")[1]);
		
		redisURL = url.parse(process.env.REDISTOGO_DATA_URL);
		redisDataClient = redis.createClient(redisURL.port,redisURL.hostname);
		redisDataClient.auth(redisURL.auth.split(":")[1]);
	} else {
		redisApiClient = redis.createClient();
		redisWebClient = redis.createClient();
		redisDataClient = redis.createClient();
	}
}
catch (err)
{
	console.log( "ERROR => Cannot connect to Redis message broker: URL => " + redisURL.hostname + "; Port => " + redisURL.port );
	console.log(err);
}

var pgWebUrl = process.env.DATABASE_WEB_URL;
if (pgWebUrl == undefined) {
	pgWebUrl = "tcp://localhost/web25c_development";
}

var express = require('express');
var RedisStore = require('connect-redis')(express);
	 
var app = express.createServer(express.logger());
app.enable("jsonp callback");
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: NODE_COOKIE_SECRET, key: NODE_COOKIE_SESSION_KEY, store: new RedisStore({ client: redisApiClient })}));
app.use(express.csrf());
app.use(rails.signedCookieParser(RAILS_COOKIE_SECRET));
app.set('view options', {
  layout: false
});

// Set up the static file directory.
app.use('/public', express.static(__dirname + '/public'));

function renderTooltip(res, data) {
	res.render('tooltip.jade', data, function(err, html) {
		res.json(html);
	});
}

app.get('/tooltip/:button_uuid', function(req, res) {
	if (req.signedRailsCookies['_25c_session']) {
		redisWebClient.get(req.signedRailsCookies['_25c_session'], function(err, user_uuid) {
			if (err != null) {
				renderTooltip(res, { user: null });
			} else {
				pg.connect(pgWebUrl, function(err, pgWebClient) {
					if (err != null) {
						renderTooltip(res, { user: null });
					} else {
						pgWebClient.query("SELECT * FROM users WHERE LOWER(uuid)=LOWER($1)", [ user_uuid ], function(err, result) {
							if (err != null) {
								console.log("could not query for user_uuid: " + err);
								renderTooltip(res, { user: null });
							} else if (result.rows.length == 0) {
								console.log("not found user_uuid=" +user_uuid);
								renderTooltip(res, { user: null });
							} else if (result.rows.length == 1) {
								var user = result.rows[0];
								var counterKey = user_uuid + ":" + req.params.button_uuid;
								redisDataClient.get(counterKey, function(err, count) {
									if (err != null) {
										renderTooltip(res, { user: user, count: 0 });
									} else {
										renderTooltip(res, { user: user, count: count });
									}
								})
							}
						});
					}
				});
			}
		});
	} else {
		renderTooltip(res, { user: null });
	}
});

app.get('/button/:button_uuid', function(req, res) {	
	res.render("button.jade", { req: req })
});

app.post('/button/:button_uuid', function(req, res) {
	if (req.signedRailsCookies['_25c_session']) {
		redisWebClient.get(req.signedRailsCookies['_25c_session'], function(err, user_uuid) {
			if (err != null) {
				console.log("POST error fetching session user_uuid: " + err);
				res.json({ error: true });				
			} else {
			  var ipAddress;
				//// first check for proxy forwarded ip
			  var forwardedIpsStr = req.header('x-forwarded-for'); 
			  if (forwardedIpsStr) {
			    var forwardedIps = forwardedIpsStr.split(',');
			    ipAddress = forwardedIps[0];
			  }
				//// fall back to connection ip
			  if (!ipAddress) {
			    ipAddress = req.connection.remoteAddress;
			  }
				var data = {
					uuid: uuid.v1(),
					user_uuid: user_uuid,
					button_uuid: req.params.button_uuid,
					referrer: req.param('_referrer'),
					user_agent: req.header('user-agent'),
					ip_address: ipAddress,
					created_at: new Date()
				};
				var counterKey = user_uuid + ":" + req.params.button_uuid;
				redisDataClient.multi().lpush(QUEUE_KEY, JSON.stringify(data)).incr(counterKey, function(err, count) {
					if (err != null) {
						console.log("POST err incrementing counter for key " + counterKey + ": " + err);
					}
				}).exec(function(err, result) {					
					if (err == null) {
						res.json({});			
					} else {
						console.log("POST err: " + err);
						res.json({ error: true });
					}
				});
			}
		});
	} else {
		console.log("POST not signed in");
		res.json({ redirect: true });
	}
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
