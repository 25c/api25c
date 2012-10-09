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

var airbrake = require('airbrake').createClient('25f60a0bcd9cc454806be6824028a900');
airbrake.developmentEnvironments = ['development'];
airbrake.handleExceptions();

var nus_config = require('./lib/short25c/lib/get-config.js');
var nus = require('./lib/short25c/lib/nus.js');

var fs = require('fs');
var nodemailer = require("nodemailer");
var EMAIL_SERVICE = "SendGrid";
var EMAIL_USERNAME = "corp25c";
var EMAIL_PASSWORD = "sup3rl!k3";
var EMAIL_FROM = "no-reply@25c.com";
var smtpTransport = nodemailer.createTransport("SMTP", {
    service: EMAIL_SERVICE,
    auth: {
        user: EMAIL_USERNAME,
        pass: EMAIL_PASSWORD
    }
});

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

if (process.env.NODE_ENV == "production") {
  var WEB_URL_BASE = "https://www.25c.com";
  var BUTTON_URL_BASE = "https://d12af7yp6qjhyn.cloudfront.net/buttons";
	var ASSETS_URL_BASE = "https://d12af7yp6qjhyn.cloudfront.net";
	var DATA25C_URL = "data.25c.com";
	var DATA25C_PORT = "443";
} else if (process.env.NODE_ENV == "staging") {
  var WEB_URL_BASE = "https://www.plus25c.com";
  var BUTTON_URL_BASE = "https://d1y0s23xz5cgse.cloudfront.net/buttons";
  var ASSETS_URL_BASE = "https://d1y0s23xz5cgse.cloudfront.net";
  var DATA25C_URL = "data.plus25c.com";
  var DATA25C_PORT = "443";
} else {
  var WEB_URL_BASE = "http://localhost:3000";
  var BUTTON_URL_BASE = "http://localhost:5000/public/images/buttons";
  var ASSETS_URL_BASE = "http://localhost:3000/s3";
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
				renderTooltip(res, { user: null });
			} else {
				pg.connect(pgWebUrl, function(err, pgWebClient) {
					if (err != null) {
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
                  // pictureUrl = ASSETS_URL_BASE + "/users/pictures/" + user.uuid + "/thumb" + user.picture_file_name.substr(user.picture_file_name.lastIndexOf("."));
                  pictureUrl = ASSETS_URL_BASE + "/users/pictures/" + user.uuid + "/thumb.jpg";
								}
								user.pictureUrl = pictureUrl;
								var nicknameUrl = "";
								if (user.nickname && user.nickname != "") {
									nicknameUrl = WEB_URL_BASE + "/" + user.nickname;
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
	  size: size,
	  height: height, 
	  width: width,
    // fontSize: fontSize,
    // textPadding: textPadding, 
	  WEB_URL_BASE: WEB_URL_BASE,
	  BUTTON_URL_BASE: BUTTON_URL_BASE,
	  referrer: referrer 
	});
});

function enqueueClick(amount, click_uuid, user_uuid, button_uuid, referrer_user_uuid, referrer, user_agent, ip_address, res) {
  click_uuid = click_uuid || uuid.v1();
  amount = parseInt(amount);
	var data = {
	  'uuid': click_uuid,
		'user_uuid': user_uuid,
		'button_uuid': button_uuid,
		'amount': amount ? amount : 25,
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

app.post('/button/:button_uuid', function(req, res) {

  //// get number of clicks to send
  var amount = req.param('amount') || 25;
  
	if (req.signedRailsCookies['_25c_session']) {
    redisWebClient.get(req.signedRailsCookies['_25c_session'], function(err, user_uuid) {
      if (err != null) {
        console.log("POST error fetching session user_uuid: " + err);
        airbrake.notify(err);
        res.json({ error: true });
      } else {
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
            // Send initial overdraft email
            // if (balance == -39) sendOverdraftEmail(user_uuid);
          }
        });
      }
    });	
	} else {
		console.log("POST not signed in");
		res.json({ redirect: true });
	}
});

function sendEmail(to, filename, args) {
  fs.readFile(filename, "utf8", function(err, data) {
    if (err) {
      "Error reading email file: " + console.log(err);
    } else {
      subject = data.split("#{", 2)[1].split("}", 1)[0];
      body = data.substring(data.indexOf("}")).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
      
      parts = body.split("#{");
      for (key in args) {
        for (i = 1; i < parts.length; i++) {
          if (parts[i].split("}", 1)[0].indexOf(key) != -1) {
            parts[i] = parts[i].replace(/.*}/, args[key]);
          }
        }
      }
      if (parts.length > 1) {
        parts[0] = parts[0].replace(/.*}\s*/, '');
        body = parts.join("");
      }
      var mailOptions = {
        from: EMAIL_FROM,
        to: to,
        subject: subject,
        html: body,
        generateTextFromHTML: true
      };
      smtpTransport.sendMail(mailOptions, function(err, response) {
        if(err){
          console.log("Could not send email: " + err);
        }
      });
    }
  });
}

function sendOverdraftEmail(uuid) {
  pg.connect(pgWebUrl, function(err, pgWebClient) {
		if (err != null) {
			console.log("Could not connect to web postgres: " + err);
			airbrake.notify(err);
			callback(err);
		} else {
      pgWebClient.query("SELECT email, first_name, nickname FROM users WHERE uuid = LOWER($1)", [ uuid ], function(err, result) {
    	  if (err != null) {
    	    console.log("Getting user email error: " + err);
        } else if (result.rows[0] == undefined) {
          console.log("User not found!");
        } else if (!result.rows[0].email) {
          console.log("User does not have an email address!");
        } else {
          userEmail = result.rows[0].email;
          userFirstName = result.rows[0].first_name;
          userNickname = result.rows[0].nickname;
          toName = userFirstName || userNickname || userEmail;
    		  sendEmail(userEmail, "overdraft_email.txt", {name: toName});
        }
      });
    }
  });
}

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
