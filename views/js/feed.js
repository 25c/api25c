$(function() {

  // SETTINGS
  var DEFAULT_SHOW = 5;
  
  // STATE VARIABLES
  var promoteVisible = false;
  var isExpanded = false;
  var user = {};
  var comments = [];
  
  // JQUERY OBJECTS
  var $commentInput = $('textarea#comment-input');
  var $pseudonymInput = $('#pseudonym-container input');
  var $feedExpand = $('#feed-expand');
  var $promoteContainer = $('#promote-container');
  var $feedContainer = $('#feed-container');
  var $infoContainer = $('info-container');
  
  // TEXT
  var DEFAULT_TEXT = {
    commentContent: 'I just gave points. Yay!',
    commentInput: $commentInput.val(),
    pseudonym: $pseudonymInput.val()
  }
  var ERROR_TEXT = {
    commentInput: "Please enter a comment.",
    pseudonym: "Invalid pseudonym."
  }
  
  fakeComments = [
    {
      uuid: 1000,
      amount: 25,
      content: "This is my awesome comment.",
      owner: {uuid: 100, amount: 25, name: "Al", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/12548470f9f3012ff5c71231381369e0/thumb.jpg"},
    },
    {
      uuid: 1001,
      amount: 55,
      content: "Thanks so much for the great article!",
      owner: {uuid: 101, amount: 50, name: "Bob", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/31a365c0b25e012f50491231381d2446/thumb.jpg"},
    },
    {
      uuid: 1002,
      amount: 40,
      content: " ",
      owner: {uuid: 102, amount: 25, name: "Carl", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/4fe81770f48b012f49af1231381554d7/thumb.jpg"},
    },
    {
      uuid: 1003,
      amount: 40,
      content: "Wow! I didn't realize that this was such an interesting topic.",
      owner: {uuid: 103, amount: 40, name: "Dave", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/50bce640ec9a012fc7fa1231381d4d5a/thumb.jpg"},
    },
    {
      uuid: 1004,
      amount: 100,
      content: "Check out my great response to this article on my personal blog: http://www.something.com/",
      owner: {uuid: 104, amount: 25, name: "Eric", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/71711960b355012f1c90123139080545/thumb.jpg"},
    },
    {
      uuid: 1005,
      amount: 60,
      content: "Great job!",
      owner: {uuid: 105, amount: 25, name: "Frank", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/79ca5a80d8f7012f6c8012313d04f26e/thumb.jpg"},
    }
  ];

  // FUNCTIONS
  
  // VALIDATE FORM (evaluated before sending form data)
  window.validateTipForm = function($form) {
    if ($form.find('textarea#comment-input').length) {
      var comment = $commentInput.val();
      if (comment == DEFAULT_TEXT.commentInput || comment == ERROR_TEXT.commentInput || comment == '') {
        $commentInput.val(' ');
      }
    }
    if ($form.find('#pseudonym-container').length) {
      var pseudonym = $pseudonymInput.val();
      if (!pseudonym || pseudonym == DEFAULT_TEXT.pseudonym) {
        $pseudonymInput.val('');
      } else if (/^\s*$/.test(pseudonym) || pseudonym == ERROR_TEXT.pseudonym) {
        $pseudonymInput.addClass('error').val(ERROR_TEXT.pseudonym);
        return false;
      }
    }
    return true;
  }
  
  // SUCCESS CALLBACK (called after tip successfully sent to server)
  window.submitSuccessCallback = function(form, response) {
    
    var uuid = form.comment_uuid || response.comment_uuid;
    
    var newComment = {};
    var existingComment = comments[findCommentIndexByUuid(uuid)];
    var amount = parseInt(form.amount);
    
    console.log(form);
    
    if (form.comment_text) {
      
      if (existingComment) {
        newComment = existingComment;
        newComment.originalAmount = amount;
      } else {
        newComment.uuid = uuid;
        newComment.owner = user;
        $('#input-container input.comment-uuid').val(uuid);
      }
      newComment.content = form.comment_text;
      newComment.owner.amount = amount;
      newComment.amount = amount;
      
      if ($pseudonymInput.val() == '') {
        $pseudonymInput.val(DEFAULT_TEXT.pseudonym);
      } else {
        newComment.owner.name = $pseudonymInput.val();
        newComment.owner.uuid = '';
        newComment.owner.pictureUrl = '';
      }
      
      if (/^\s*$/.test($commentInput.val())) {
        $commentInput.val(DEFAULT_TEXT.commentInput);
      }
      
    } else { 
      newComment = existingComment;
      setTimeout(function() {
        $('#' + newComment.uuid + ' .item-promote-container').click();
      }, 0);
      if (newComment.originalAmount) {
        newComment.amount = newComment.originalAmount + amount;
      } else {
        newComment.originalAmount = newComment.amount;
        newComment.amount += amount;
      }
    }
    
    if (!existingComment) {
      comments.push(newComment);
      comments.sort(sortFunction);
    }
        
    updateComments(newComment);
  }
  
  function findCommentIndexByUuid(uuid, comment) {
    for (i in comments) {
      if (comments[i].uuid == uuid) {
        if (comment) {
          comments[i] = comment;
        }
        return i;
      }
    }
    return false;
  }
  
  function sortFunction(a, b) {
    return(b.amount - a.amount);
  }

  function initializeComments(data) {

    if (window.DEMO_MODE) {
      comments = fakeComments;
    } else {
      comments = data.widget || [];
    }
    
    user = data.user;
                          
    if (user && user.isTipper) {
      $('.user-image').css({
        'background-image': getUserPictureUrl(user)
      }).show();
      $('#comment-container').css('margin-left', 222);
      $('#form-container .tip-container, #pseudonym-container').css('left', 65);
      $('#promote-container .tip-container').css('left', 135);
      $('#promote-container #promote-text').css('margin-left', 200);
    } else {
      // NOT LOGGED IN AS TIPPER
    }
        
    comments.sort(sortFunction);
  
    for (i in comments) {
      var $feedItem = createFeedItem(comments[i]);
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
      $nextComment.before($feedItem);
    } else if (comments.length > 1) {
      $('.feed-item:last').after($feedItem);
    } else {
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
    var pictureUrl = 'url("';
    if (window.DEMO_MODE) {
      pictureUrl += user.pictureUrl ? user.pictureUrl : window.assetsUrlBase + '/users/pictures/no_pic.png';
    } else if (user.uuid) {
      pictureUrl += window.usersUrlBase + '/users/pictures/' + user.uuid + '/thumb.jpg';
    } else {
      pictureUrl += window.assetsUrlBase + '/users/pictures/no_pic.png';
    }
    return pictureUrl + '")';
  }
  
  function createFeedItem(comment) {    
    var $itemImage = $('<div />', {
      class: 'item-image',
      css: {
        'background-image': getUserPictureUrl(comment.owner)
      }
    });
    
    var $itemName = $('<div />', {
      class: 'item-name'
    }).text('—' + comment.owner.name);
    
    if (!comment.content || /^\s*$/.test(comment.content)) {
      var content = DEFAULT_TEXT.commentContent.replace('#{amount}', comment.owner.amount);
    } else {
      var content = formatCommentText(comment.content);
    }
    
    var $itemBody = $('<div />', {
      class: 'item-body'
    }).html(content);
    
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
    
    if (user && user.isWidgetOwner) {
      $itemText.append($('<a />', {
        class: 'item-hide'
      }).text('Remove'));
    }
    
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
                  
      if (comments.length > DEFAULT_SHOW) {
        $feedContainer.css('margin-bottom', 30);
        var newHeight = $feedContainer.outerHeight(true) + $('#input-container').outerHeight(true) + 2;
        if (expandIframe) {
          isExpanded = true;
          $feedExpand.css({
            'top': '',
            'bottom': ''
          }).html('<h3>Show Fewer Notes</h3>');
        } else {
          isExpanded = false;
          var $lastDefaultShown = $('.feed-item:eq(4)');
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
        var newHeight = $feedContainer.outerHeight(true) + $('#input-container').outerHeight(true) + 2;
        $feedContainer.show();
        $feedExpand.hide();
        $feedContainer.css('margin-bottom', '');
      }            
    } else {
      $feedContainer.hide();
      var newHeight = $('#input-container').outerHeight(true) + 2;
    }
        
    $.postMessage(
      JSON.stringify({
        uuid: buttonUuid,
        command: 'set-height', 
        height: newHeight
      }),
      window.parentUrl
    );
  }
  
  function formatCommentText(text) {
    text = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(exp,"<a target='_blank' href='$1'>$1</a>");
  }
  
  // HANDLERS
  
  $feedContainer.on({ 
    click: function() {
      if (window.confirm('Are you sure you want to remove this comment? You must abide by the guidelines of the 25c Terms of Service.')) {
        var commentUuid = $(this).parents('.feed-item').attr('id');
        $.ajax({
          type: 'POST',
          url: '/hide/' + buttonUuid + '/' + commentUuid,
          data: {referrer: window.parentUrl, _csrf: sessionCsrf},
          success: function(data) {
            if (data.error) {
              // comment not removed
            } else {
              comments.splice(findCommentIndexByUuid, 1);
              $('#' + commentUuid).hide('fast', function() {
                $(this).remove();
                updateIframeHeight(isExpanded);
              });
            }
          },
          dataType: "json",
          async: false
        });
      }
    }
  }, '.item-hide').on({
    click: function() {
      var $this = $(this);
      if ($this.hasClass('selected')) {
        $this.removeClass('selected');
        $promoteContainer.hide();
      } else {
        $('.item-promote-container.selected').removeClass('selected');
        $this.addClass('selected');
        var $item = $this.parents('.feed-item');
        var uuid = $item.attr('id');
        var comment = comments[findCommentIndexByUuid(uuid)];
        var showTip = 1;
        if (comment.originalAmount && comment.amount > comment.originalAmount) {
          showTip = comment.amount - comment.originalAmount;
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
      }
      updateIframeHeight(isExpanded);
    }
  }, '.item-promote-container');  
    
  $feedExpand.click(function() {
    updateIframeHeight(!isExpanded);
  });
  
  $commentInput.add($pseudonymInput).focus(function() {
    var $this = $(this);
    var type = $this.attr('id') == 'comment-input' ? 'commentInput' : 'pseudonym';
    var content = $this.val();
    if (content == DEFAULT_TEXT[type] || content == ERROR_TEXT[type]) {
      $this.val('');
      $this.removeClass('error default');
    }
  }).blur(function() {
    var $this = $(this);
    var type = $this.attr('id') == 'comment-input' ? 'commentInput' : 'pseudonym';
    if ($this.val() == '') {
      $this.val(DEFAULT_TEXT[type]).addClass('default');
    }
  });
      
  // INITIALIZATION
  getWidgetCache(initializeComments);
  updateIframeHeight(false);
  
  if (window.siteTitle) {
    $('#site-title').text(window.siteTitle);
  }
});


