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
var https = require('https');
var redis = require('redis');
var rails = require('./rails');
var url = require('url');
var uuid = require('node-uuid');
var pg = require('pg').native;
var express = require('express');
var querystring = require('querystring');
var crypto = require('crypto');

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
  var TIP_URL_BASE = "https://tip.25c.com";
	var ASSETS_URL_BASE = "https://d12af7yp6qjhyn.cloudfront.net";
	var USERS_URL_BASE = "https://d12af7yp6qjhyn.cloudfront.net";
	var DATA25C_URL = "data.25c.com";
	var DATA25C_PORT = "443";
} else if (process.env.NODE_ENV == "staging") {
  var WEB_URL_BASE = "https://www.plus25c.com";
  var TIP_URL_BASE = "https://tip.plus25c.com";
  var ASSETS_URL_BASE = "https://d1y0s23xz5cgse.cloudfront.net";
  var USERS_URL_BASE = "https://d1y0s23xz5cgse.cloudfront.net";
  var DATA25C_URL = "data.plus25c.com";
  var DATA25C_PORT = "443";
} else {
  var WEB_URL_BASE = "http://localhost:3000";
  var TIP_URL_BASE = "http://localhost:3000";
  var ASSETS_URL_BASE = "https://d1y0s23xz5cgse.cloudfront.net";
  var USERS_URL_BASE = "http://localhost:3000/s3";
  var DATA25C_URL = "localhost";
  var DATA25C_PORT = "5400";
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

function renderTooltip(res, data) {
	res.render('tooltip.jade', data, function(err, html) {
	  if (err) {
			console.log(err);
			airbrake.notify(err);
		}
		res.jsonp(html);
	});
}

app.get('/tooltip/:button_uuid', function(req, res) {
	if (req.signedRailsCookies['_25c_session']) {
		redisWebClient.get(req.signedRailsCookies['_25c_session'], function(err, user_uuid) {
			if (err != null) {
			  console.log("failed to retrieve cookie information from redis.");
				renderTooltip(res, { user: null });
			} else {
				pg.connect(pgWebUrl, function(err, pgWebClient) {
					if (err != null) {
					  console.log("failed to connect to postgres database.");
						renderTooltip(res, { user: null });
					} else {
						pgWebClient.query("SELECT * FROM users WHERE LOWER(uuid)=LOWER($1)", [ user_uuid ], function(err, result) {
							if (err != null) {
								console.log("could not query for user_uuid: " + err);
								airbrake.notify(err);
								renderTooltip(res, { user: null });
							} else if (result.rows.length == 0) {
								console.log("not found user_uuid=" +user_uuid);
								//// delete the cookie
								res.clearCookie('_25c_session');
								renderTooltip(res, { user: null });
							} else if (result.rows.length == 1) {
								var user = result.rows[0];
								var displayName = "";
								if (user.first_name && user.first_name != "") {
									displayName = user.first_name;
								}
								if (user.last_name && user.last_name != "") {
									if (displayName != "") {
										displayName += " ";
									}
									displayName += user.last_name;
								}
								if (displayName == "" && user.nickname && user.nickname != "") {
									displayName = user.nickname;
								}
								if (displayName == "" && user.email && user.email != "") {
									displayName = user.email;
								}
								user.displayName = displayName;
								var pictureUrl = "";
								if (user.picture_file_name && user.picture_file_name != "") {
                  // pictureUrl = USERS_URL_BASE + "/users/pictures/" + user.uuid + "/thumb" + user.picture_file_name.substr(user.picture_file_name.lastIndexOf("."));
                  pictureUrl = USERS_URL_BASE + "/users/pictures/" + user.uuid + "/thumb.jpg";
								}
								user.pictureUrl = pictureUrl;
								var nicknameUrl = "";
								if (user.nickname && user.nickname != "") {
									nicknameUrl = TIP_URL_BASE + "/" + user.nickname;
								}
								user.nicknameUrl = nicknameUrl;
							  //// get shortened referrer url
                nus.shorten(req.header("referrer")+'/'+user.uuid+'/0', function (err, reply) {
                    var referrer_url = null;
                    if (err) {
                      console.log(err);
                      airbrake.notify(err);
                    } else {
                      referrer_url = nus_config.url + '/' + reply.hash;
                    }
  									if (err != null) {
  										renderTooltip(res, { user: user, count: 0, referrer_url: referrer_url });
  									} else {
  										renderTooltip(res, { user: user, count: 0, referrer_url: referrer_url });
  									}
                });
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
	var size = req.param("size");
	var height;
	var width;
	var fontSize;
	if ((size == undefined) || (size == null) || (size.match(/^(btn-large|btn-medium|btn-small|icon-large|icon-medium|icon-small|tip-large|tip-medium|tip-small)$/i) == null)) {
		size = "btn-small";
	}
	size = size.toLowerCase();
	if (size.match(/-large/)) {
		height = 40;
		if (size.match(/icon-/)) {
		  width = 40;
	  } else {
	    width = 72;
    }
	} else if (size.match(/-medium/)) {
		height = 30;
		if (size.match(/icon-/)) {
	    width = 30;
	  } else {
	    width = 54;
    }
	} else {	  
		height = 20;
		if (size.match(/icon-/)) {
		  width = 20;
	  } else if (size.match(/-text/)) {
	      width = 60;
	  } else {
	    width = 36;
    }
	}
	
	referrer = req.header('referrer');
  
  // console.log(req.session._csrf);
  req.session.clickUuids = {};
	
	res.render("button.jade", { 
	  req: req,
	  referrer: referrer,
	  size: size,
	  height: height, 
	  width: width,
    // fontSize: fontSize,
    // textPadding: textPadding,
    WEB_URL_BASE: WEB_URL_BASE,
	  ASSETS_URL_BASE: ASSETS_URL_BASE,
	  USERS_URL_BASE: USERS_URL_BASE
	});
});

app.post('/button/:button_uuid', function(req, res) {

  //// get number of clicks to send
  var amount = req.param('amount') || 25;
  var button_uuid = req.params.button_uuid;
  var message = req.param('message');  
  
  var referrer = req.param('_referrer');
  if (referrer) {
    referrer = /^[a-z]+:\/\/\/?[^\/]+(\/[^?]*)/i.exec(referrer)[0];
    var referrer_hash = crypto.createHash('md5').update(referrer).digest("hex");
  }
  
	if (req.signedRailsCookies['_25c_session']) {
    redisWebClient.get(req.signedRailsCookies['_25c_session'], function(err, user_uuid) {
      if (err != null) {
        console.log("POST error fetching session user_uuid: " + err);
        airbrake.notify(err);
        res.json({ error: true });
      } else {
        
        //// push user message to DB
        if (referrer && message) {
          redisDataClient.set(user_uuid + ':' + button_uuid + ':' + referrer_hash, message, function(err, balance_str) {
            if (err != null) {
              console.log("POST error setting user message.");
              airbrake.notify(err);
            } else {
              // message sent.
            }
          });
        }
        
        //// fetch user and check balance
        redisDataClient.get("user:" + user_uuid, function(err, balance_str) {
          if (err != null) {
            console.log("POST error fetching user balance: " + err);
            airbrake.notify(err);
            res.json({ error: true });
          } else {
            if (balance_str == null) {
              balance = 0;
            } else {
              balance = parseInt(balance_str);
            }
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
            
            if (req.session.clickUuids[req.params.button_uuid]) {
              var uuid = req.session.clickUuids[req.params.button_uuid];
            } else {
              var uuid = "";
            }
            
            //// check for a button referrer
            if (req.cookies['_25c_referrer']) {
              redisWebClient.get(req.cookies['_25c_referrer'], function(err, button_referrer_data) {
                var button_referrer = JSON.parse(button_referrer_data);
                //// verify host match
                var includeReferrer = url.parse(button_referrer['url']).hostname == url.parse(req.param('_referrer')).hostname;   
                req.session.clickUuids[req.params.button_uuid] = enqueueClick(
                  amount,
                  uuid,
                  user_uuid, 
                  req.params.button_uuid, 
                  includeReferrer? button_referrer['referrer_user_uuid'] : null, 
                  req.param('_referrer'), 
                  req.header('user-agent'), 
                  ipAddress, 
                  res
                );
              });
            } else {       
              req.session.clickUuids[req.params.button_uuid] = enqueueClick(
                amount,
                uuid,
                user_uuid, 
                req.params.button_uuid, 
                null, 
                req.param('_referrer'), 
                req.header('user-agent'), 
                ipAddress, 
                res
              );
            }
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
	res.render("belt.jade", {
	  req: req,
	  referrer: referrer,
	  WEB_URL_BASE: WEB_URL_BASE,
	  ASSETS_URL_BASE: ASSETS_URL_BASE,
	  USERS_URL_BASE: USERS_URL_BASE
	});
});

app.post('/users/:button_uuid', function(req, res) {
  
  var button_uuid = req.params.button_uuid;
  var user_uuid = "";
  var userTips = [];
  var usersResult = [];
  var messages = [];
  
  var referrer = req.body.referrer;
  if (referrer) {
    referrer = /^[a-z]+:\/\/\/?[^\/]+(\/[^?]*)/i.exec(referrer)[0];
    var referrer_hash = crypto.createHash('md5').update(referrer).digest("hex");
  }
  var retrieveMessages = req.body.messages == "true";
  
  
  if (req.signedRailsCookies['_25c_session']) {
    redisWebClient.get(req.signedRailsCookies['_25c_session'], function(err, uuid) {
      if (err != null) {
        console.log("POST error fetching session user_uuid: " + err);
        airbrake.notify(err);
        res.json({ error: true });
      } else {
        user_uuid = uuid;
        fetchUserInfo();
      }
    });
  } else {
    fetchUserInfo();
  }
  
  function fetchUserInfo() {
    pg.connect(pgWebUrl, function(err, pgWebClient) {
		  if (err != null) {
  			console.log("Could not connect to web postgres: " + err);
  			airbrake.notify(err);
  			res.json({ error: true });
  		} else {
        pgWebClient.query("SELECT id FROM buttons WHERE uuid = LOWER($1)", [ button_uuid ], function(err, result) {
      	  if (err != null) {
      	    console.log("Getting button id error: " + err);
      	    airbrake.notify(err);
      			res.json({ error: true });
          } else if (result.rows[0] == undefined) {
            console.log("No buttons found.");
      	    airbrake.notify("No buttons found for fan belt.");
      			res.json({ error: true });
          } else {
            var button_id = result.rows[0].id;
            pg.connect(pgDataUrl, function(err, pgDataClient) {
              if (err != null) {
                console.log("Could not connect to data postgres: " + err);
                airbrake.notify(err);
                res.json({ error: true });
              } else {
                var queryString = "SELECT user_id, SUM(CASE WHEN clicks.state=1 THEN clicks.amount ELSE null END) AS unfunded, \
                  SUM(CASE when clicks.state BETWEEN 2 AND 4 THEN clicks.amount ELSE null END) AS funded \
                  FROM clicks WHERE state BETWEEN 1 AND 4 AND clicks.button_id=$1";
                if (referrer) queryString += " AND clicks.referrer LIKE '" + referrer + "%'";
                queryString += " GROUP BY user_id ORDER BY user_id;";
                
                pgDataClient.query(queryString, [ button_id ], function(err, result) {
                 if (err != null) {
                   console.log("Getting click count error: " + err);
                  } else {
                    userTips = result.rows;
                    
                    var queryString = "SELECT uuid, first_name, last_name, nickname, email, picture_file_name FROM users WHERE is_suspended = 0 AND ";
                    
                    if (user_uuid && userTips.length == 0) {
                      queryString += " uuid=LOWER('" + user_uuid + "');";
                    } else {
                      queryString += " id IN (";
                      for (i in userTips) {
                        queryString += userTips[i].user_id;
                        if (i < userTips.length - 1) queryString += ",";
                        else queryString += ")";
                      }
                      if (user_uuid) {
                        queryString += " OR uuid=LOWER('" + user_uuid + "')";
                      }
                      queryString += " ORDER BY id;";
                    }
                                      
                    pgWebClient.query(queryString, function(err, result) {
                      usersResult = result;
                      if (err != null) {
                        console.log("Getting user email error: " + err);
                        airbrake.notify(err);
                        res.json({ error: true });
                      } else if (usersResult.rows[0] == undefined) {
                        console.log("No users found.");
                        res.json({});
                      } else if (usersResult.rows.length != userTips.length && usersResult.rows.length != userTips.length + 1) {
                        console.log("Number of users found doesn't match tips found.");
                        airbrake.notify("Number of users found doesn't match tips found.");
                        res.json({ error: true });
                      } else {
                        if (retrieveMessages) {
                          var multi = redisDataClient.multi();
                          var userUuids = [];
                          
                          for (i = 0 ; i < usersResult.rows.length; i++) {
                            var user = usersResult.rows[i];
                            userUuids.push(user.uuid);                            
                            multi.get(user.uuid + ':' + button_uuid + ':' + referrer_hash);
                          }
                          
                          multi.exec(function(err, result) {
                            if (err) {
                              console.log("Error getting user messages.");
                              airbrake.notify(err);
                        			res.json({ error: true });
                            } else {
                              for (i in userUuids) {
                                messages[userUuids[i]] = result[i] || '';
                              }
                              sendUserData();
                            }
                          });
                          
                          redisDataClient.get("user:" + user_uuid, function(err, balance_str) {
                            
                        
                            
                          });
                        } else {
                          sendUserData();
                        }
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }
  
  function sendUserData() {
    var users = [];
    var offset = 0;                  
    for (i = 0 ; i < usersResult.rows.length; i++) {
      var user = usersResult.rows[i];
      if (user.first_name || user.last_name) {
        var name = user.first_name + " " + user.last_name;
      } else {
        var name = user.nickname || user.email.substring(0, user.email.indexOf("@"));
      }
      var profileUrl = user.nickname ? TIP_URL_BASE + "/" + user.nickname : '';
      var pictureUrl = user.picture_file_name ? USERS_URL_BASE + "/users/pictures/" + user.uuid + "/thumb.jpg" : '';
    
      if (user.uuid == user_uuid) {
        var currentUser = true;
      } else {
        var currentUser = false;
      }
    
      if (user.uuid == user_uuid && usersResult.rows.length > userTips.length) {
        offset = -1;
        var funded = 0;
        var unfunded = 0;
      } else {
      
        var funded = parseInt(userTips[i + offset].funded) || 0;
        var unfunded = parseInt(userTips[i + offset].unfunded) || 0;
      
      }
      users.push({
        currentUser: currentUser,
        uuid: user.uuid,
        name: name,
        profileUrl: profileUrl,
        pictureUrl: pictureUrl,
        funded: funded,
        unfunded: unfunded,
        message: messages[user.uuid] || ''
      });
    
    }
    res.json({ users: users });
  }
  
});

app.get('/feed/:button_uuid', function(req, res) {  
	referrer = req.header('referrer');
  req.session.clickUuids = {};
	res.render("feed.jade", {
	  req: req,
	  referrer: referrer,
	  WEB_URL_BASE: WEB_URL_BASE,
	  ASSETS_URL_BASE: ASSETS_URL_BASE,
	  USERS_URL_BASE: USERS_URL_BASE
	});
});

function enqueueClick(amount, click_uuid, user_uuid, button_uuid, referrer_user_uuid, referrer, user_agent, ip_address, res) {
  click_uuid = click_uuid || uuid.v1();
  amount = parseInt(amount);
	var data = {
	  'uuid': click_uuid,
		'user_uuid': user_uuid,
		'button_uuid': button_uuid,
		'amount': amount,
		'referrer_user_uuid': referrer_user_uuid,
		'referrer': referrer,
		'user_agent': user_agent,
		'ip_address': ip_address,
		'created_at': new Date()
	};
  redisDataClient.lpush(QUEUE_KEY, JSON.stringify(data), function(err) {
    if (err == null) {
			res.json({});
		} else {
			airbrake.notify(err);
			res.json({ error: true });
		}
  });
  return click_uuid;
}

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
