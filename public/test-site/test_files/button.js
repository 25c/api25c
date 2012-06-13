// Copyright 2012 25c. All Rights Reserved.

/**
 * @fileoverview The file which installs the 25c iframe/button on the client.
 *
 * @author duane.barlow@gmail.com (Duane Barlow)
 */


goog.provide('_25c.Button');

goog.require('goog.dom');
goog.require('goog.style');
goog.require('goog.positioning');
goog.require('goog.positioning.AnchoredViewportPosition');


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
  '2': { width: 24, height: 25 }
};


/**
 * The constructor, creates a new button.
 *
 * @constructor
 */
_25c.Button = function () {
  this.script = (function() {
    var scripts = goog.dom.getElementsByTagNameAndClass('script');
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

  this.uuid = this.getParam('uuid');
  this.type = this.getParam('type');
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
    'src': this.script.baseUrl + '/button/' + this.uuid + '?type=' + this.type
  });
  
  document.write('<div id="' + this.containerId + '"></div>');
  goog.dom.appendChild(goog.dom.getElement(this.containerId), this.iframe);
};


/**
 * Gets a query string parameter from the script source.
 *
 * @param {string} name The name of the query string parameter.
 * @return {string} The value of the query string parameter.
 */
_25c.Button.prototype.getParam = function (name) {
  var query = this.script.src.split('?')[1];
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == name) {
      return unescape(pair[1]);
    }
  }
};

new _25c.Button();