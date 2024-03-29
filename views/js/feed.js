$(function() {

  // SETTINGS
  var DEFAULT_SHOW = 5;
  
  // STATE VARIABLES
  var promoteVisible = false;
  var isExpanded = false;
  var facebookExpandHeight = 0;
  var user = {};
  var comments = [];
  
  // JQUERY OBJECTS
  var $commentInput = $('textarea#comment-input');
  var $pseudonymContainer = $('#pseudonym-container');
  var $pseudonymInput = $pseudonymContainer.find('input');
  var $confirmContainer = $('#confirm-container');
  var $viewComment = $confirmContainer.find('a#view-comment');
  var $feedExpand = $('#feed-expand');
  var $expandTitle = $feedExpand.find('#expand-title');
  var $promoteContainer = $('#promote-container');
  var $feedContainer = $('#feed-container');
  var $sponsorsContainer = $("#sponsors-container");
  var $commentContainer = $("#comment-container");
  
  // TEXT
  var DEFAULT_TEXT = {
    commentContent: "", //'I just gave points. Yay!',
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
      amount: 20,
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
      $pseudonymContainer.hide();
      $confirmContainer.show().find('a').attr('data-uuid', newComment.uuid);

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
    
    if (!window.HIDE_NOTES) {
      $commentContainer.toggle();
    }
    
    if (!existingComment) {
      comments.push(newComment);
      comments.sort(sortFunction);
    }
        
    updateComments(newComment);
  }
  
  window.tipUpdate = function() {
    $pseudonymContainer.show();
    $confirmContainer.hide();
  };
  
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
      $('#top-sponsors-header').css('padding-left', 88);
      $('#sponsors-container').css('margin-left', 222);
      $('#input-container > h2').css('left', 245);
      $('#form-container .tip-container, #info-container').css('left', 65);
      $('#promote-container .tip-container').css('left', 135);
      $('#promote-container #promote-text').css('margin-left', 200);
    } else {
      // NOT LOGGED IN AS TIPPER
    }
        
    comments.sort(sortFunction);
  
    for (i in comments) {
      if (comments[i].content && $.trim(comments[i].content) != "") {
        var $feedItem = createFeedItem(comments[i]);
        $feedContainer.append($feedItem);
      }
      
      var $sponsorItem = createSponsorItem(comments[i]);
      $sponsorsContainer.append($sponsorItem);
    }
    
    if (comments.length) {
      if (!window.HIDE_NOTES) {
        $feedContainer.show();
        updateIframeHeight(false);
      }
      $('#sponsors-prompt').remove();
    }
  }

  function updateComments(newComment) {
        
    var nextCommentUuid = '';
    var position = 0;

    for (i in comments) {
      if (newComment.amount > comments[i].amount && comments[i].uuid != newComment.uuid) {
        nextCommentUuid = comments[i].uuid;
        position = i - 1;
        break;
      }
    }
    
    $('#' + newComment.uuid).remove();
    $('#sponsor-' + newComment.uuid).remove();
        
    var $feedItem = null;
    if (newComment.content && $.trim(newComment.content) != "") {
      $feedItem = createFeedItem(newComment);
    }
    var $sponsorItem = createSponsorItem(newComment);
    $('#sponsors-prompt').remove();
          
    if (nextCommentUuid) {
      if ($feedItem != null) {
        var $nextComment = $('#' + nextCommentUuid);
        $nextComment.before($feedItem);
      }
      var $nextSponsor = $('#sponsor-' + nextCommentUuid);
      $nextSponsor.before($sponsorItem);
    } else if (comments.length > 1) {
      position = comments.length - 1;
      if ($feedItem != null) {
        $('.feed-item:last').after($feedItem);
      }
      $('.sponsor-item:last').after($sponsorItem);
    } else {
      position = 0;
      if ($feedItem != null) {
        $feedContainer.append($feedItem);
      }
      $sponsorsContainer.append($sponsorItem);
    }
        
    if ($feedItem != null && promoteVisible) {
      $feedItem.after($promoteContainer);
    }
    
    if ($feedItem != null) {
      $feedItem.addClass('initial').delay(3000).animate({ backgroundColor: "transparent" }, "slow");
      FB.XFBML.parse($feedItem.get(0));
    }
        
    if (position > DEFAULT_SHOW) {
      isExpanded = true;
    }
        
    if ($feedItem != null) {
      if (position == 0) {
        $confirmContainer.find('#top-comment').show();
        $confirmContainer.find('#lower-comment').add($viewComment).hide();
      } else {
        $confirmContainer.find('#top-comment').hide();
        $confirmContainer.find('#lower-comment').add($viewComment).show();
      }
    } else {
      $confirmContainer.hide();
    }
    
    if (!window.HIDE_NOTES) {
      updateIframeHeight(isExpanded);
    }
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
  
  function createSponsorItem(comment) {
    var $sponsorImage = $('<div />', {
      class: 'sponsor-image',
      css: {
        'background-image': getUserPictureUrl(comment.owner),
        'background-size': '50px 50px'
      }
    });    
    var $sponsorItem = $('<div />', {
      id: 'sponsor-' + comment.uuid,
      class: 'sponsor-item'
    }).append(
      $sponsorImage,
      $('<div class="clear"></div>')
    );        
    return $sponsorItem;    
  }
  
  function createFeedItem(comment) {    
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
          });
          $expandTitle.text('Show Fewer Notes');
        } else {
          isExpanded = false;
          var $lastDefaultShown = $('.feed-item:eq(4)');
          if ($lastDefaultShown.length) {
            newHeight = $lastDefaultShown.offset().top + $lastDefaultShown.height() + 63;
            if ($lastDefaultShown.next('#promote-container:visible').length) {
              newHeight += $promoteContainer.outerHeight(true);
            }
            $feedExpand.show();
          }
          $feedExpand.css({
            'top': newHeight - 32,
            'bottom': 'auto'
          })
          $expandTitle.text('Show All Notes');
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

    if (facebookExpandHeight) {
      newHeight += facebookExpandHeight;
    }

    var commentContainerVisible = $commentContainer.is(':visible');
    if (commentContainerVisible) {
      // If the add comment container is visible, make sure the height is 250 minimum.
      // (Number can change with design changes)
      newHeight = Math.max(newHeight, 250);
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
  
  $commentContainer.on('click', '.comment-cancel', function() {
    $commentContainer.hide();
  })
  
  $feedContainer.on({ 
    click: function() {
      if (window.confirm('Are you sure you want to remove this comment? You must abide by the guidelines of the 25c Terms of Service.')) {
        var commentUuid = $(this).parents('.feed-item').attr('id');
        $.ajax({
          type: 'POST',
          url: '/hide/' + buttonUuid + '/' + commentUuid,
          data: {referrer: window.parentUrl, _csrf: sessionCsrf},
          success: function(data) {
            if (data.error && !window.DEMO_MODE) {
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
  $('.tip-update').click(function() {
    if (!window.HIDE_NOTES) {
      updateIframeHeight(isExpanded);
    }
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
  
  $viewComment.click(function() {
    var uuid = $(this).attr('data-uuid');
    if (uuid) {
      var newPosition = $('#' + uuid).offset().top || 0;
      $.postMessage(
        JSON.stringify({
          uuid: buttonUuid,
          command: 'scroll-to', 
          position: newPosition
        }),
        window.parentUrl
      );
    }
  });
  
  setTimeout(function() {
    FB.Event.subscribe('edge.create', function(response) {
      var uuid = response.substring(response.indexOf('/notes/') + 7);
      var index = findCommentIndexByUuid(uuid);
      if ((index == comments.length - 1 && isExpanded)
        || (index == DEFAULT_SHOW - 1 && !isExpanded)) {
          facebookExpandHeight = $('#' + uuid + ' .fb-like iframe:first').height() - 60;
          updateIframeHeight(isExpanded);
        }
    });
  }, 1000);
      
  // INITIALIZATION
  window.getWidgetCache(initializeComments);
  
  if (window.siteTitle) {
    $('#site-title').text(window.siteTitle);
  }
});
