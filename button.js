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

var redis = require('redis');
var rails = require('./rails');
var url = require('url');
var uuid = require('node-uuid');
var pg = require('pg').native;
var express = require('express');
var querystring = require('querystring');
var request = require('request');

var airbrake = require('airbrake').createClient('25f60a0bcd9cc454806be6824028a900');
airbrake.developmentEnvironments = ['development'];
airbrake.handleExceptions();

var nus_config = require('./lib/short25c/lib/get-config.js');
var nus = require('./lib/short25c/lib/nus.js');

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
	airbrake.notify(err);
}

var pgWebUrl = process.env.DATABASE_WEB_URL;
if (pgWebUrl == undefined) {
	pgWebUrl = "tcp://localhost/web25c_development";
}

var pgDataUrl = process.env.DATABASE_DATA_URL;
if (pgDataUrl == undefined) {
	pgDataUrl = "tcp://localhost/data25c_development";
}

if (process.env.NODE_ENV == "production") {
  var WEB_URL_BASE = "https://www.25c.com";
	var ASSETS_URL_BASE = "https://s3.amazonaws.com/assets.25c.com";
	var USERS_URL_BASE = "https://s3.amazonaws.com/assets.25c.com";
	var DATA25C_URL_BASE = "https://data.25c.com";
	var FB_APP_ID = "403609836335934";
} else if (process.env.NODE_ENV == "staging") {
  var WEB_URL_BASE = "https://www.plus25c.com";
  var ASSETS_URL_BASE = "https://s3.amazonaws.com/assets.plus25c.com";
  var USERS_URL_BASE = "https://s3.amazonaws.com/assets.plus25c.com";
  var DATA25C_URL_BASE = "data.plus25c.com";
  var FB_APP_ID = "303875413052772";
} else {
  var WEB_URL_BASE = "http://localhost:3000";
  var ASSETS_URL_BASE = "https://s3.amazonaws.com/assets.plus25c.com";
  var USERS_URL_BASE = "http://localhost:3000/s3";
  var DATA25C_URL_BASE = "http://localhost:5300";
  var FB_APP_ID = "180097582134534";
}

var express = require('express');
var RedisStore = require('connect-redis')(express);

// var app = express.createServer(express.logger());
var app = express();
app.enable("jsonp callback");
app.use(express.compress());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: NODE_COOKIE_SECRET, key: NODE_COOKIE_SESSION_KEY, cookie: { maxAge: 900000 }, store: new RedisStore({ client: redisApiClient })}));
app.use(express.csrf());
app.use(rails.signedCookieParser(RAILS_COOKIE_SECRET));
app.set('view options', {
  layout: false
});

// Set up the static file directory.
app.use('/public', express.static(__dirname + '/public'));

app.post('/tip/:button_uuid', function(req, res) {

  //// get number of clicks to send
  var button_uuid = req.params.button_uuid;
  var button_url = req.param('_url');

  var amount = parseInt(req.param('amount')) || 1;
  var comment_text = req.param('comment_text') || '';
  var comment_uuid = req.param('comment_uuid') || '';
  var comment_pseudonym = req.param('comment_pseudonym') || '';
    
  var referrer = req.param('_referrer');
  
	if (req.signedRailsCookies['_25c_session']) {
    redisWebClient.get(req.signedRailsCookies['_25c_session'], function(err, user_uuid) {
      if (err != null) {
        console.log("POST error fetching session user_uuid: " + err);
        airbrake.notify(err);
        res.json({ error: true });
      } else {
        pg.connect(pgWebUrl, function(err, pgWebClient) {
  				if (err != null) {
  				  console.log("failed to connect to postgres database: " + err);
  				  airbrake.notify(err);
  				  res.json({ error: true });
  				} else {
            pgWebClient.query("SELECT balance_paid, balance_free FROM users WHERE uuid=LOWER('" + user_uuid + "')", function(err, result) {             
              if (err != null) {
                console.log("Getting session user info error: " + err);
                airbrake.notify(err);
                res.json({ error: true });
              } else if (result.rows.length) {
                var user = result.rows[0];
                var balance = user.balance_paid + user.balance_free - amount;
                if (balance >= 0) {
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

                  if (comment_uuid && req.session.commentUuids[comment_uuid]) {
                    var click_uuid = req.session.commentUuids[comment_uuid];
                  } else if (req.session.clickUuids[req.params.button_uuid]) {
                    var click_uuid = req.session.clickUuids[req.params.button_uuid];
                  } else {
                    var click_uuid = uuid.v1().replace('-', '');
                    if (!comment_uuid && comment_text) {
                      comment_uuid = uuid.v1().replace('-', '');
                    }
                  }

                  var click = {
                	  'uuid': click_uuid,
                		'user_uuid': user_uuid,
                		'button_uuid': req.params.button_uuid,
                		'amount': amount,
                		'referrer_user_uuid': null,
                		'referrer': req.param('_referrer'),
                		'user_agent': req.header('user-agent'),
                		'ip_address': ipAddress,
                		'created_at': new Date(),
                		'url': button_url
                  }

                  if (comment_uuid) {
              		  click.comment_uuid = comment_uuid;
              		  req.session.commentUuids[comment_uuid] = comment_uuid;
              		  if (comment_text) {
              		    click.comment_text = comment_text;
            		    }
            		    if (comment_pseudonym) {
            		      click.comment_pseudonym = comment_pseudonym;
          		      }
              		} else {
                    req.session.clickUuids[req.params.button_uuid] = click_uuid;
                  }
                                    
                  //// check for a button referrer
                  if (req.cookies['_25c_referrer']) {
                    redisWebClient.get(req.cookies['_25c_referrer'], function(err, button_referrer_data) {
                      var button_referrer = JSON.parse(button_referrer_data);
                      //// verify host match
                      var includeReferrer = url.parse(button_referrer['url']).hostname == url.parse(req.param('_referrer')).hostname;
                      if (includeReferrer) {
                        click.referrer_user_uuid = button_referrer['referrer_user_uuid'];
                      }  
                      enqueueClick(click, balance, res);
                    });
                  } else {
                    enqueueClick(click, balance, res);
                  }

                } else {
                  console.log("User does not have enough points.");
              		res.json({ redirect: true, insufficient: true });
                }
              } else {
                // NO USER FOUND
                console.log("No tipper user found.");
            		res.json({ redirect: true });
              }
            });
          }
        });
      }
    });
  } else {
    console.log("POST not signed in");
		res.json({ redirect: true });
  }
});

app.get('/belt/:button_uuid', function(req, res) {  
	referrer = req.header('referrer');
	req.session.clickUuids = {};
  req.session.commentUuids = {};
	res.render("belt.jade", {
	  req: req,
	  referrer: referrer,
	  WEB_URL_BASE: WEB_URL_BASE,
	  ASSETS_URL_BASE: ASSETS_URL_BASE,
	  USERS_URL_BASE: USERS_URL_BASE
	});
});

app.get('/feed/:button_uuid', function(req, res) {
	referrer = req.header('referrer');
	req.session.clickUuids = {};
  req.session.commentUuids = {};
	res.render("feed.jade", {
	  req: req,
	  referrer: referrer,
	  WEB_URL_BASE: WEB_URL_BASE,
	  ASSETS_URL_BASE: ASSETS_URL_BASE,
	  USERS_URL_BASE: USERS_URL_BASE,
	  FB_APP_ID: FB_APP_ID
	});
});

app.post('/widget/:button_uuid', function(req, res) {
    
  var button_uuid = req.params.button_uuid;
  var button_url = req.query.url;
  var current_user = null;
    
  if (req.signedRailsCookies['_25c_session']) {
    redisWebClient.get(req.signedRailsCookies['_25c_session'], function(err, user_uuid) {
      if (err != null) {
        console.log("POST error fetching session user uuid: " + err);
        airbrake.notify(err);
        res.json({ error: true });
      } else {        
        pg.connect(pgWebUrl, function(err, pgWebClient) {
					if (err != null) {
					  console.log("failed to connect to postgres database: " + err);
					  airbrake.notify(err);
					  res.json({ error: true });
					} else {
					  
            var queryString = "SELECT users.first_name, users.last_name, users.nickname, " + 
            "users.email, users.balance_free, users.balance_paid, users.role, buttons.id " +
            "FROM users LEFT JOIN buttons ON (buttons.user_id = users.id AND buttons.uuid = " + 
            "LOWER('" + button_uuid + "')) WHERE users.uuid = LOWER('" + user_uuid + "')";
                        
            pgWebClient.query(queryString, function(err, result) {             
              if (err != null) {
                console.log("Getting session user info error: " + err);
                airbrake.notify(err);
                res.json({ error: true });
              } else {
                if (result.rows[0]) {
                  var data = result.rows[0];
                  if (data.first_name || data.last_name) {
                    var name = data.first_name + ' ' + data.last_name;
                  } else {
                    var name = data.nickname || data.email;
                  }
                  current_user = {
                    uuid: user_uuid,
                    name: name,
                    balance: data.balance_free + data.balance_paid,
                    isTipper: data.role == 'tipper',
                    isWidgetOwner: Boolean(data.id)
                  }
                }
                fetchWidgetCache();
              }
            });
          }
        });
      }
   });
  } else {
    fetchWidgetCache();
  }
  
  function fetchWidgetCache() {
    redisDataClient.get(button_uuid + ':' + button_url, function(err, widget_data) {
      if (err != null) {
        console.log("POST error fetching widget cache: " + err);
        airbrake.notify(err);
        res.json({ error: true });
      } else {
        var cache = JSON.parse(widget_data);
        
        console.log(cache);
        
        res.json({ widget: cache, user: current_user });
      }
    });
  }
});

app.post('/hide/:button_uuid/:comment_uuid', function(req, res) {
    
  var button_uuid = req.params.button_uuid;
  var comment_uuid = req.params.comment_uuid;
    
  if (req.signedRailsCookies['_25c_session']) {
    redisWebClient.get(req.signedRailsCookies['_25c_session'], function(err, user_uuid) {
      if (err != null) {
        console.log("POST error fetching session user uuid: " + err);
        airbrake.notify(err);
        res.json({ error: true });
      } else {
        pg.connect(pgWebUrl, function(err, pgWebClient) {
					if (err != null) {
					  console.log("failed to connect to postgres database: " + err);
					  airbrake.notify(err);
					  res.json({ error: true });
					} else {
					  var queryString = "SELECT COUNT(*) FROM users, buttons WHERE users.uuid = LOWER('" + user_uuid 
					    + "') AND users.id = buttons.user_id AND buttons.uuid = LOWER('" + button_uuid + "')";
            pgWebClient.query(queryString, function(err, result) {             
              if (err != null) {
                console.log("Getting session user info error: " + err);
                airbrake.notify(err);
                res.json({ error: true });
              } else {                                
                // if (result.rows[0].count >= 1) {
                if (true) {
                  request.post(DATA25C_URL_BASE + '/api/comments/block', {
                    form: {'uuids[]': comment_uuid}
                  }, function(err) {
                    if (err != null) {
                      console.log("Setting comment to hidden error: " + err);
                      airbrake.notify(err);
                      res.json({ error: true });
                    } else {
                      res.json({});
                    }
                  });
                } else {
                  res.json({ error: true });
                }
              }
            });
          }
        });
      }
    });
  }
});

function enqueueClick(click, balance, res) {
  redisDataClient.lpush(QUEUE_KEY, JSON.stringify(click), function(err) {
    if (err == null) {
      if (click.comment_uuid) {
        res.json({comment_uuid: click.comment_uuid, balance: balance});
      } else {
			  res.json({balance: balance});
		  }
		} else {
			airbrake.notify(err);
			res.json({ error: true });
		}
  });
}

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
