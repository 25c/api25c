// Copyright 2012 25c. All Rights Reserved.

/**
 * @fileoverview The file which installs the 25c iframe/button on the client.
 *
 * @author duane.barlow@gmail.com (Duane Barlow)
 */


goog.provide('_25c.Button');

/**
 * Gets the script source before the dev version of closure
 *    adds new scripts.
 */
_25cScript = (function() {
  var scripts = document.getElementsByTagName('script');
  var scriptElement = scripts[scripts.length - 1];

  var scriptSource = '';
  if (scriptElement.getAttribute.length !== undefined) {
    scriptSource = scriptElement.getAttribute('src');
  } else {
    scriptSource = scriptElement.getAttribute('src', 2);
  }
  var sourceSplit = scriptSource.split('/');
  return {
    src: scriptSource,
    element: scriptElement,
    baseUrl: sourceSplit[0] + '//' + sourceSplit[2]
  };
}());

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.style');
goog.require('goog.positioning');


/**
 * Number of buttons created on the page so far.
 *
 * @type {number}
 * @private
 */
_25c.buttonCount_ = _25c.buttonCount_ | 0;


/**
 * The map of dimensions for the different button types.
 *
 * @type {Object}
 * @private
 */
_25c.dimensionsMap_ = {
  '1': { width: 60, height: 60 },
  '2': { width: 31, height: 31 }
};


/**
 * The constructor, creates a new button.
 *
 * @constructor
 */
_25c.Button = function (options) {
  var button = this;
  this.uuid = _25c.config.uuid;
  this.type = _25c.config.type;

  this.buttonNumber = ++_25c.buttonCount_;
  this.containerId = '_25c_container_' + this.buttonNumber;

  this.iframe = goog.dom.createDom('iframe', {
    'style': 'vertical-align: middle; display: inline-block; *display: inline; *zoom: 1;',
    'id': '_25c_' + this.buttonNumber,
    'name': '_25c_' + this.buttonNumber,
    'scrolling': 'no',
    'frameborder': '0',
    'border': '0',
    'width': _25c.dimensionsMap_[this.type].width,
    'height': _25c.dimensionsMap_[this.type].height,
    'src': _25c.config.script.baseUrl + '/button/' + this.uuid + '/' + this.type
  });

  goog.style.installStyles('._25c-dropdown-container div { border-radius: 8px; background: white; padding: 8px; height: 24px }._25c-dropdown-container { display: none; padding: 8px; border-radius: 10px; background: rgba(83,39,21,.6); position: absolute; top: 35px; left: -195px; width: 420px; height: 40px; }._25c-dropdown-container-visible { display: block; }')

  this.dropdownContainer = goog.dom.createDom('div', {
    'className': '_25c-dropdown-container'
  }, goog.dom.createDom('div', {}, 'Dropdown contents'));

  document.write('<div id="' + this.containerId + '" style="padding:1px;display:inline-block;*display:inline;*zoom:1;position:relative;"></div>');
  this.buttonContainer = goog.dom.getElement(this.containerId);
  goog.dom.appendChild(this.buttonContainer, this.dropdownContainer);
  goog.dom.appendChild(this.buttonContainer, this.iframe);

  goog.events.listen(this.buttonContainer, goog.events.EventType.MOUSEOVER, function (e) {
    var mbc = new MouseBoundaryCrossing(e, button.buttonContainer);
    if(mbc.enteredLandmark) {
      goog.dom.classes.add(button.dropdownContainer, '_25c-dropdown-container-visible');
    }
  });
  goog.events.listen(this.buttonContainer, goog.events.EventType.MOUSEOUT, function (e) {
    var mbc = new MouseBoundaryCrossing(e, button.buttonContainer);
    if(mbc.leftLandmark) {
      goog.dom.classes.remove(button.dropdownContainer, '_25c-dropdown-container-visible');
    }
  });
};


/**
 * Gets a query string parameter from the script source.
 *
 * @param {string} name The name of the query string parameter.
 * @return {string} The value of the query string parameter.
 */
_25c.getParam = function (name) {
  var query = _25cScript.src.split('?')[1];
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == name) {
      return unescape(pair[1]);
    }
  }
};

_25c.config = (function (){
  return {
    uuid: _25c.getParam('uuid'),
    type: _25c.getParam('type'),
    script: _25cScript
  };
}());


_25c.mouseover = function () {
  console.log('over');
};

_25c.mouseout = function () {
  console.log('out');
};

/**
 * Creates the button.
 */
_25c.newButton = function () {
  new _25c.Button();
};

//since mouseenter & mouseleave are only supported in IE, this object helps to
// determine if the mouse is entering or leaving an element
//landmark: did the mouse enter or leave this "landmark" element? Was the event fired from within this element?
//usage:   var mbc = new MouseBoundaryCrossing(mouse_event, landmark);
function MouseBoundaryCrossing(evt, landmark)
{
	evt = evt || window.event;
	
	var eventType = evt.type;
	
	this.inLandmark = false;
	this.leftLandmark = false;
	this.enteredLandmark = false;
	
	if(eventType == "mouseout")
	{
		this.toElement = evt.relatedTarget || evt.toElement;
		this.fromElement = evt.target || evt.srcElement;
	}
	else if(eventType == "mouseover")
	{
		this.toElement = evt.target || evt.srcElement;
		this.fromElement = evt.relatedTarget || evt.fromElement;
	}
	else throw (new Error("Event type \""+eventType+"\" is irrelevant"));	//irrelevant event type
	
	//target is unknown
	//this seems to happen on the mouseover event when the mouse is already inside the element when the page loads and
	// the mouse is moved: fromElement is undefined
	if(!this.toElement || !this.fromElement) throw (new Error("Event target(s) undefined"));
	
	//determine whether from-element is inside or outside of landmark (i.e., does tmpFrom == the landmark or the document?)
	var tmpFrom = this.fromElement;
	while(tmpFrom.nodeType == 1)	//while tmpFrom is an element node
	{
		if(tmpFrom == landmark) break;
		tmpFrom = tmpFrom.parentNode;
	}
	
	//determine whether to-element is inside or outside of landmark (i.e., does tmpTo == the landmark or the document?)
	var tmpTo = this.toElement;
	while(tmpTo.nodeType == 1)	//while tmpTo is an element node
	{
		if(tmpTo == landmark) break;
		tmpTo = tmpTo.parentNode;
	}
	
	if(tmpFrom == landmark && tmpTo == landmark) this.inLandmark = true;	//mouse is inside landmark; didn't enter or leave
	else if(tmpFrom == landmark && tmpTo != landmark)	//mouse left landmark
	{
		this.leftLandmark = true;
		this.inLandmark = (eventType == "mouseout");	//mouseout: currently inside landmark, but leaving now
														//mouseover: currently outside of landmark; just left
	}
	else if(tmpFrom != landmark && tmpTo == landmark)	//mouse entered landmark
	{
		this.enteredLandmark = true;
		this.inLandmark = (eventType == "mouseover");	//mouseover: currently inside landmark; just entered
														//mouseout: currently outside of landmark, but entering now
	}
	//else	//mouse is outside of landmark; didn't enter or leave
}