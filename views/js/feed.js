$(function() {

  // SETTINGS
  var DEFAULT_SHOW = 5;
  
  // STATE VARIABLES
  var promoteVisible = false;
  var isExpanded = false;
  var user = {};
  var comments = [];
  var promoteTips = {};
  
  // JQUERY OBJECTS
  var $commentInput = $('textarea#comment-input');
  var $pseudonymInput = $('#pseudonym-container input');
  var $feedExpand = $('#feed-expand');
  var $promoteContainer = $('#promote-container');
  var $feedContainer = $('#feed-container');
  var $infoContainer = $('info-container');
  
  // TEXT
  var DEFAULT = {
    comment: $commentInput.val(),
    pseudonym: $pseudonymInput.val()
  }
  var ERROR = {
    comment: "Please enter a comment.",
    pseudonym: "Invalid pseudonym."
  }
    
  // DEBUG
  var DEBUG_MODE = false;
  
  var fakeUser = {
    uuid: 99,
    name: 'Lionel',
    pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/0d6174d0ec9a012fc7f71231381d4d5a/thumb.jpg"
  };
  
  fakeComments = [
    {
      uuid: 1000,
      amount: 25,
      text: "This is my awesome comment.",
      owner: {uuid: 100, amount: 25, name: "Al", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/12548470f9f3012ff5c71231381369e0/thumb.jpg"},
    },
    {
      uuid: 1001,
      amount: 55,
      text: "Thanks so much for the great article!",
      owner: {uuid: 101, amount: 50, name: "Bob", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/31a365c0b25e012f50491231381d2446/thumb.jpg"},
    },
    {
      uuid: 1002,
      amount: 40,
      text: "Excellent job getting this info.",
      owner: {uuid: 102, amount: 25, name: "Carl", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/4fe81770f48b012f49af1231381554d7/thumb.jpg"},
    },
    {
      uuid: 1003,
      amount: 40,
      text: "Wow! I didn't realize that this was such an interesting topic.",
      owner: {uuid: 103, amount: 40, name: "Dave", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/50bce640ec9a012fc7fa1231381d4d5a/thumb.jpg"},
    },
    {
      uuid: 1004,
      amount: 100,
      text: "Check out my great response to this article on my personal blog: http://www.something.com/",
      owner: {uuid: 104, amount: 25, name: "Eric", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/71711960b355012f1c90123139080545/thumb.jpg"},
    },
    {
      uuid: 1005,
      amount: 60,
      text: "Great job!",
      owner: {uuid: 105, amount: 25, name: "Frank", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/79ca5a80d8f7012f6c8012313d04f26e/thumb.jpg"},
    }
  ];

  // FUNCTIONS
  
  // VALIDATE FORM (evaluated before sending form data)
  window.validateTipForm = function($form) {
    if ($form.find('textarea#comment-input').length) {
      var comment = $commentInput.val();
      if (comment == DEFAULT.comment || comment == ERROR.comment || comment == '') {
        $commentInput.addClass('error').val(ERROR_COMMENT);
        return false;
      }
    }
    if ($form.find('#pseudonym-container').length) {
      var pseudonym = $pseudonymInput.val();
      if (!pseudonym || pseudonym == DEFAULT.pseudonym) {
        $pseudonymInput.val('');
      } else if (/^\s*$/.test(pseudonym) || pseudonym == ERROR.pseudonym) {
        $pseudonymInput.addClass('error').val(ERROR.pseudonym);
        return false;
      }
    }
    return true;
  }
  
  // SUCCESS CALLBACK (called after tip successfully sent to server)
  window.submitSuccessCallback = function(form, response) {
    
    var uuid = form.comment_uuid || response.comment_uuid;
    
    var newComment = {};
    var existingComment = findCommentByUuid(uuid);
    var amount = parseInt(form.amount);
            
    if (form.comment_text) {
      if (existingComment) {
        newComment = existingComment;
        promoteTips[uuid] = {
          originalCommentAmount: amount, 
          originalPromoteAmount: 0,
          sessionPromoteAmount: 0
        }
      } else {
        newComment.uuid = uuid;
        newComment.owner = user;
        $('#input-container input.comment-uuid').val(uuid);
      }
      newComment.content = form.comment_text;
      newComment.owner.amount = amount;
      newComment.amount = amount;
      
      if ($pseudonymInput.val() == '') {
        $pseudonymInput.val(DEFAULT.pseudonym);
      }
    } else {
      newComment = existingComment;
      var newPromoter = user;
      newPromoter.amount = amount;
      newComment = updatePromoter(newComment, newPromoter);
    }
    
    if (!existingComment) {
      comments.push(newComment);
      comments.sort(sortFunction);
    }
        
    updateComments(newComment);
  }
  
  function findCommentByUuid(uuid, comment) {
    for (i in comments) {
      if (comments[i].uuid == uuid) {
        if (comment) {
          comments[i] = comment;
        }
        return comments[i];
      }
    }
    return false;
  }
    
  function sortFunction(a, b) {
    return(b.amount - a.amount);
  }

  function initializeComments(data) {

    if (DEBUG_MODE) {
      user = fakeUser;
      comments = fakeComments;
    } else {
      user = data.user;
      comments = data.widget || [];
    }
          
    if (user) {
      $('.user-image').css({
        'background-image': getUserPictureUrl(user)
      }).show();
      $commentInput.width(391);
    }
        
    comments.sort(sortFunction);
  
    for (i in comments) {

      var $feedItem = createFeedItem(comments[i]);
      
      if (i == DEFAULT_SHOW - 1 || (i == comments.length - 1) && (comments.length < DEFAULT_SHOW)) {
        $feedItem.addClass('last-default-shown');
      }
      
      $feedContainer.append($feedItem);
    }
    
    if (comments.length) {
      $feedContainer.show();
    }
  }

  function updateComments(newComment) {
        
    var nextCommentUuid = '';
    var position = 0;

    for (i in comments) {
      if (newComment.amount > comments[i].amount && comments[i].uuid != newComment.uuid) {
        nextCommentUuid = comments[i].uuid;
        position = i;
        break;
      }
    }
    
    $('#' + newComment.uuid).remove();
        
    $feedItem = createFeedItem(newComment);
          
    if (nextCommentUuid) {
      var $nextComment = $('#' + nextCommentUuid);
      if ($nextComment.hasClass('last-default-shown')) {
        $nextComment.removeClass('last-default-shown');
        $feedItem.addClass('last-default-shown');
      }
      $nextComment.before($feedItem);
    } else if (comments.length > 1) {
      $('.feed-item:last').after($feedItem);
    } else {
      $feedItem.addClass('last-default-shown');
      $feedContainer.append($feedItem);
    }
        
    if (promoteVisible) {
      $feedItem.after($promoteContainer);
    }
    
    $feedItem.addClass('initial').delay(3000).animate({ backgroundColor: "transparent" }, "slow");
    FB.XFBML.parse($feedItem.get(0));
    if (position > DEFAULT_SHOW) {
      isExpanded = true;
    }
    updateIframeHeight(isExpanded);
  }
  
  function getUserPictureUrl(user) {
    if (DEBUG_MODE) {
      return 'url("' + comment.owner.pictureUrl + ')';
    } else if (user.uuid) {
      return 'url("' + window.usersUrlBase + '/users/pictures/' + user.uuid + '/thumb.jpg")';
    } else {
      return 'url("' + window.assetsUrlBase + '/users/pictures/no_pic.png")';
    }
  }
  
  function createFeedItem(comment) {
    // TODO: make sure to show original tip amount, not total comment amount, in givenText
    var givenText = comment.owner.name + ' gave <span class="tip-amount">' + comment.amount;
    givenText += parseInt(comment.amount) > 1 ? ' points</span>' : ' point</span>';
    
    var $itemImage = $('<div />', {
      'data-given': givenText,
      class: 'item-image',
      css: {
        'background-image': getUserPictureUrl(comment.owner)
      }
    });
    
    var $itemName = $('<div />', {
      class: 'item-name'
    }).text('—' + comment.owner.name);
    
    var $itemBody = $('<div />', {
      class: 'item-body'
    }).text(comment.content);
    
    var $itemLike = $('<div />', {
      class: 'item-like'
    }).append($('<div />', {
      class: 'fb-like',
      // TODO: Replace with URL for FB scraper that refers to the comment uuid
      'data-href': window.webUrlBase + '/notes/' + comment.uuid,
      'data-send': 'false',
      'data-layout': 'button_count',
      'data-width': '450',
      'data-show-faces': 'false'
    }));

    var totalText = comment.amount + ' point';
    totalText += comment.amount == 1 ? '' : 's';
    
    var $itemTotal = $('<div />', {
      class: 'item-total'
    }).text(totalText);
    
    var $itemPromote = $('<div />', {
      class: 'item-promote-container'
    }).append($('<div />', {
      class: 'item-promote'
    }));
    
    var $itemFooter = $('<div />', {
      class: 'item-footer'
    }).append($itemLike, $itemTotal, $itemPromote);
    
    var $itemText = $('<div />', {
      class: 'item-text'
    }).append($itemBody, $itemName, $itemFooter);    
    
    var $feedItem = $('<div />', {
      id: comment.uuid,
      class: 'feed-item'
    }).append(
      $itemImage, 
      $itemText,
      $('<div class="clear"></div>')
    );
        
    return $feedItem;
  }
    
  function updateIframeHeight(expandIframe) {
        
    if (comments.length) {
      
      var newHeight = $feedContainer.height() + 148;
      
      if (comments.length > DEFAULT_SHOW) {
        $feedContainer.css('margin-bottom', 30);
        newHeight += 30;
        if (expandIframe) {
          isExpanded = true;
          $feedExpand.css({
            'top': '',
            'bottom': ''
          }).html('<h3>Show Fewer Notes</h3>');
        } else {
          isExpanded = false;
          var $lastDefaultShown = $('.last-default-shown');
          if ($lastDefaultShown.length) {
            newHeight = $lastDefaultShown.offset().top + $lastDefaultShown.height() + 63;
            $feedExpand.show();
          }
          $feedExpand.css({
            'top': newHeight - 32,
            'bottom': 'auto'
          }).html('<h3>Show All Notes</h3>');
        }
      } else {
        $feedContainer.show();
        $feedExpand.hide();
        $feedContainer.css('margin-bottom', '');
      }
            
      $.postMessage(
        JSON.stringify({
          uuid: buttonUuid,
          command: 'set-height', 
          height: newHeight
        }),
        parentUrl
      );
    }
  }
  
  // HANDLERS
  
  $feedContainer.on({
    mouseenter: function() {
      var $this = $(this);
      $infoContainer.css({
        display: 'block',
        top: $this.position().top + $this.height() + 2,
        left: $this.position().left
      }).html($this.attr('data-given'));
    },
    mouseleave: function() {
      $infoContainer.hide();
    }
  }, '.promoter-image, .item-image').on({
    click: function() {
      promoteVisible = !promoteVisible;
      if (promoteVisible) {
        var $item = $(this).parents('.feed-item');
        var uuid = $item.attr('id');
        var existingTip = promoteTips[uuid];
        var showTip = 1;
        if (existingTip && existingTip.sessionPromoteAmount > 0) {
          showTip = existingTip.sessionPromoteAmount;
          $promoteContainer.find('.tip-confirm').show();
          $promoteContainer.find('.tip-send').hide();
        } else {
          $promoteContainer.find('.tip-confirm').hide();
          $promoteContainer.find('.tip-send').show();
        }
        $promoteContainer.find('.tip-amount').text(showTip);
        $promoteContainer.find('input.tip-input').val(showTip);
        $promoteContainer.insertAfter($item).css({
          display: 'block',
        }).find('.comment-uuid').val(uuid);
      } else {
        $promoteContainer.hide();
      }
      updateIframeHeight(isExpanded);
    }
  }, '.item-promote-container');
  
  var inputDefaultText = $commentInput.val();
  
  $feedExpand.click(function() {
    updateIframeHeight(!isExpanded);
  });
  
  $commentInput.add($pseudonymInput).focus(function() {
    var $this = $(this);
    var type = $this.attr('id') == 'comment-input' ? 'comment' : 'pseudonym';
    var content = $this.val();
    if (content == DEFAULT[type] || content == ERROR[type]) {
      $this.val('');
      $this.removeClass('error default');
    }
  }).blur(function() {
    var $this = $(this);
    var type = $this.attr('id') == 'comment-input' ? 'comment' : 'pseudonym';
    if ($this.val() == '') {
      $this.val(DEFAULT[type]).addClass('default');
    }
  });
      
  // INITIALIZATION
  getWidgetCache(initializeComments);
  updateIframeHeight(false);
  
});