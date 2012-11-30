$(function() {

  // SETTINGS
  var DEFAULT_SHOW = 5;
  
  // TIMERS
  var promoteHoverTimer = null;

  // STATE VARIABLES
  var isExpanded = false;
  var testObject = {uuid: '', amount: 0.25};
  var user = [];
  var comments = [];
  var promoteTips = {};
  
  // JQUERY OBJECTS
  var $commentInput = $('textarea#comment-input');
  var $feedExpand = $('#feed-expand');
  
  var DEFAULT_COMMENT = $commentInput.val();
  var ERROR_COMMENT = "Please enter a comment.";

  // FUNCTIONS
  
  // VALIDATE FORM (evaluated before sending form data)
  
  window.validateTipForm = function($form) {
    if ($form.find('textarea#comment-input').length) {
      var comment = $commentInput.val();
      if (comment == DEFAULT_COMMENT || comment == ERROR_COMMENT || comment == '') {
        $commentInput.addClass('error').val(ERROR_COMMENT);
        return false;
      }
    }
    
    return true;
  }
  
  // SUCCESS CALLBACK (called after tip successfully sent to server)
  
  window.submitSuccessCallback = function(form, response) {
    
    // DEBUG
    response = {uuid: '999'};
    
    
    var uuid = form.comment_uuid || response.uuid;
    
    var newComment = {};
    var existingComment = findCommentByUuid(uuid);
    var amount = parseFloat(form.amount.replace('$', ''));
    
    if (form.message) {
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
      }
      newComment.text = form.message;
      newComment.owner.amount = amount;
      newComment.amount = amount;
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
  
  function updatePromoter(comment, promoter) {
    var originalCommentAmount = -1;
    var originalPromoteAmount = -1;
    
    if (promoteTips[comment.uuid]) {
      originalCommentAmount = promoteTips[comment.uuid].originalCommentAmount;
      originalPromoteAmount = promoteTips[comment.uuid].originalPromoteAmount;
    } else {
      originalCommentAmount = comment.amount;
    }
        
    comment.amount = originalCommentAmount + promoter.amount;
      
    if (comment.owner.uuid != promoter.uuid) {
      var isAlreadyPromoter = false;
      for (i in comment.promoters) {
        if (comment.promoters[i].uuid == promoter.uuid) {
          if (originalCommentAmount < 0) {
            originalCommentAmount = comment.promoters[i].amount;
          }
          comment.promoters[i].amount = originalPromoteAmount + promoter.amount;
          isAlreadyPromoter = true;
          break;
        }
      }
      if (!isAlreadyPromoter) {
        originalPromoteAmount = 0;
        comment.promoters.push(promoter);
      }
      comment.promoters.sort(sortFunction);
    }        
    promoteTips[comment.uuid] = {
      originalCommentAmount: originalCommentAmount, 
      originalPromoteAmount: originalPromoteAmount,
      sessionPromoteAmount: promoter.amount
    }
    return comment;
  }
  
  function getUserInfo() {
    $.ajax({
      type: "POST",
      url: "/users/" + buttonUuid,
      data: {messages: 'true', referrer: parentUrl, _csrf: sessionCsrf},
      success: function(data) {
        if (!data.users) {
          // something went wrong
        } else {
          
        }  
          
        // DEBUG
        user = {
          uuid: 99,
          name: 'Lionel',
          pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/0d6174d0ec9a012fc7f71231381d4d5a/thumb.jpg"
        };
        
        // DEBUG
        comments = [
          {
            uuid: 1000,
            amount: 20,
            text: "This is my awesome comment.",
            owner: {uuid: 100, amount: 1, name: "Al", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/12548470f9f3012ff5c71231381369e0/thumb.jpg"},
            promoters: [
              {uuid: 106, amount: 1, name: "Alice", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/e4788250f48e012f6e12123139081365/thumb.jpg"},
              {uuid: 107, amount: 1, name: "Ann", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/22cf6310d918012ff891123138152cb3/thumb.jpg"}
            ]
          },
          {
            uuid: 1001,
            amount: 55,
            text: "Thanks so much for the great article!",
            owner: {uuid: 101, amount: 50, name: "Bob", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/31a365c0b25e012f50491231381d2446/thumb.jpg"},
            promoters: [
              {uuid: 108, amount: 5, name: "Barbara", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/41c86070aebd012f4c7222000a8c4def/thumb.jpg"}
            ]
          },
          {
            uuid: 1002,
            amount: 40,
            text: "Excellent job getting this info.",
            owner: {uuid: 102, amount: 1, name: "Carl", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/4fe81770f48b012f49af1231381554d7/thumb.jpg"},
            promoters: [
              {uuid: 109, amount: 1, name: "Charlotte", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/50bce640ec9a012fc7fa1231381d4d5a/thumb.jpg"},
              {uuid: 110, amount: 2, name: "Cameron", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/57853590de7f012fca7512313d13fc17/thumb.jpg"},
              {uuid: 111, amount: 1, name: "Carol", pictureUrl: ""},
              {uuid: 112, amount: 1, name: "Cher", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/988e1d90de80012fca7b12313d13fc17/thumb.jpg"},
              {uuid: 113, amount: 1, name: "Cesaria", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/a89f3870b439012f99ca12313809465c/thumb.jpg"},
              {uuid: 114, amount: 1, name: "Claire", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/71711960b355012f1c90123139080545/thumb.jpg"},
              {uuid: 115, amount: 1, name: "Chloe", pictureUrl: ""},
              {uuid: 116, amount: 1, name: "Christine", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/71711960b355012f1c90123139080545/thumb.jpg"}
            ]
          },
          {
            uuid: 1003,
            amount: 40,
            text: "Wow! I didn't realize that this was such an interesting topic.",
            owner: {uuid: 103, amount: 40, name: "Dave", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/50bce640ec9a012fc7fa1231381d4d5a/thumb.jpg"},
            promoters: []
          },
          {
            uuid: 1004,
            amount: 10,
            text: "Check out my great response to this article on my personal blog: http://www.something.com/",
            owner: {uuid: 104, amount: 1, name: "Eric", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/71711960b355012f1c90123139080545/thumb.jpg"},
            promoters: []
          },
          {
            uuid: 1005,
            amount: 60,
            text: "Great job!",
            owner: {uuid: 105, amount: 1, name: "Frank", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/79ca5a80d8f7012f6c8012313d04f26e/thumb.jpg"},
            promoters: [
              {uuid: 117, amount: 1, name: "Flore", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/7b6fd560aed4012fd5e0123139180e6a/thumb.jpg"}
            ]
          }
        ];
        
        populateUsers();
      },
      dataType: "json",
      async: false
    });
  }

  function sortFunction(a, b) {
    return(b.amount - a.amount);
  }

  function populateUsers() {

    comments.sort(sortFunction);
  
    for (i in comments) {

      var $feedItem = createFeedItem(comments[i]);
      
      if (i == DEFAULT_SHOW - 1 || (i == comments.length - 1) && (comments.length < DEFAULT_SHOW)) {
        $feedItem.addClass('last-default-shown');
      }
      
      $('#feed-container').append($feedItem);
    }
    
    $('#call-item').hide();
  }

  function updateComments(newComment) {
        
    var nextCommentUuid = '';

    for (i in comments) {
      if (newComment.amount > comments[i].amount && comments[i].uuid != newComment.uuid) {
        nextCommentUuid = comments[i].uuid;
        break;
      }
    }
    
    $('#' + newComment.uuid).remove();
        
    $feedItem = createFeedItem(newComment);
    $feedItem.find('.item-controls .item-total').show();
          
    if (nextCommentUuid) {
      var $nextComment = $('#' + nextCommentUuid);
      if ($nextComment.hasClass('last-default-shown')) {
        $nextComment.removeClass('last-default-shown');
        $feedItem.addClass('last-default-shown');
      }
      $nextComment.before($feedItem);
    } else {
      $('.feed-item:last').after($feedItem);
    }
    
    $feedItem.addClass('initial').animate({backgroundColor: 'transparent'}, '2000');
    toggleIframeHeight(isExpanded);
    
  }
  
  function createFeedItem(comment) {
    var $itemImage = $('<div />', {
      'data-name': comment.owner.name,
      'data-amount': comment.owner.amount,
      class: 'item-image',
      css: {
        'background-image': comment.owner.pictureUrl ?
        'url(' + comment.owner.pictureUrl + ')' 
        : 'url("' + assetsUrlBase + '/users/pictures/no_pic.png")'
      }
    });
    
    var $itemName = $('<div />', {
      class: 'item-name'
    }).text('—' + comment.owner.name);
    
    var $itemBody = $('<div />', {
      class: 'item-body'
    }).text(comment.text);
    
    var $itemText = $('<div />', {
      class: 'item-text'
    }).append($itemBody, $itemName);    
    
    var $itemPromote = $('<div />', {
      class: 'item-controls'
    }).append($('<span />', {
        class: 'item-total'
      }).text('$' + comment.amount.toFixed(2)), 
      $('<div />', {
        class: 'item-promote'
    }));
    
    
    var $feedItem = $('<div />', {
      id: comment.uuid,
      class: 'feed-item'
    }).append(
      $itemImage, 
      $itemText,
      $itemPromote,
      $('<div class="clear"></div>')
    );
    
    if (comment.promoters && comment.promoters.length) {  
      $feedItem.append(createItemPromoters(comment.promoters));
    }
    
    return $feedItem;
  }
  
  function createItemPromoters(promoters) {
    var $itemPromotedTitle = $('<div />', {
      class: 'item-promoted-title'
    }).text("Promoted by");
    
    var $itemPromoters = $('<div />', {
      class: 'item-promoters'
    }).append($itemPromotedTitle);
  
    for (j in promoters) {
      var promoter = promoters[j];
      $itemPromoters.append($('<div />', {
        'data-name': promoter.name,
        'data-amount': promoter.amount,
        class: 'promoter-image',
        css: {
          'background-image': promoter.pictureUrl ? 
          'url(' + promoter.pictureUrl + ')' 
          : 'url("' + assetsUrlBase + '/users/pictures/no_pic.png")'
        }
      }));
    }
    $itemPromoters.append($('<div class="clear"></div>'));
    return $itemPromoters;
  }
  
  function toggleIframeHeight(expandIframe) {
    if (expandIframe) {
      isExpanded = true;
      var newHeight = $('#outer-container').height() + 30;
      $feedExpand.css({
        'top': '',
        'bottom': ''
      }).html('<h3>Show Fewer Notes</h3>');
    } else {
      isExpanded = false;
      var $lastDefaultShown = $('.last-default-shown');
      var newHeight = $lastDefaultShown.offset().top + $lastDefaultShown.height() + 60;
      $('#feed-expand').css({
        'top': newHeight - 56,
        'bottom': 'auto'
      }).html('<h3>Show All Notes</h3>');
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
  
  // HANDLERS

  $('#feed-container').on({
    mouseenter: function() {
      var $this = $(this);
      $('#info-container').css({
        display: 'block',
        top: $this.position().top + $this.height() + 2,
        left: $this.position().left
      }).html($this.attr('data-name') + ' tipped <span class="tip-amount">$' + parseFloat($this.attr('data-amount')).toFixed(2) + '</span>');
    },
    mouseleave: function() {
      $('#info-container').hide();
    }
  }, '.promoter-image, .item-image').on({
    mouseenter: function() {
      clearTimeout(promoteHoverTimer);
      var $this = $(this);
      var $promoteContainer = $('#promote-container');
      var uuid = $this.parent().attr('id');
      var existingTip = promoteTips[uuid];
      var tipString = '$0.25';
      if (existingTip && existingTip.sessionPromoteAmount > 0) {
        tipString = '$' + existingTip.sessionPromoteAmount.toFixed(2);
        $promoteContainer.find('.tip-confirm').show();
        $promoteContainer.find('.tip-send').hide();
      } else {
        $promoteContainer.find('.tip-confirm').hide();
        $promoteContainer.find('.tip-send').show();
      }
      $promoteContainer.find('.tip-amount').text(tipString);
      $promoteContainer.find('input.tip-input').val(tipString);
      $promoteContainer.css({
        display: 'block',
        top: $this.position().top + $this.height() + 2
      }).find('#comment-uuid').val(uuid);
      var $itemPromote = $this.find('.item-promote');
      $itemPromote.show();
      $('.item-total').show();
    },
    mouseleave: function() {
      promoteHoverTimer = setTimeout(function() {
        $('#promote-container').hide();
        $('.item-total').hide();
      }, 1000);
    }, 
  }, '.item-controls');
  
  $('#promote-container').hover(function() {
      clearTimeout(promoteHoverTimer);
    }, function() {
      promoteHoverTimer = setTimeout(function() {
        $('#promote-container').hide();
        $('.item-total').hide();
      }, 1000);
  });
  
  $('#input-container .tip-container').hover(function() {
      $('#promote-container').hide();
      $('.item-total').show();
      clearTimeout(promoteHoverTimer);
    }, function() {
      promoteHoverTimer = setTimeout(function() {
        $('.item-total').hide();
      }, 1000);
  });
  
  var inputDefaultText = $("#input-text").val();
  
  $('#example-text').click(function() {
    $("textarea#input-text").focus();
  });
  
  $("textarea#input-text").focusin(function() {
    $('#example-text').hide();
  }).focusout(function() {
    if (!/[^\s]/.test($(this).val())) $('#example-text').show();
  });
  
  $('#feed-expand').click(function() {
    toggleIframeHeight(!isExpanded);
  });
  
  $commentInput.focus(function() {
    var comment = $commentInput.val();
    if (comment == DEFAULT_COMMENT || comment == ERROR_COMMENT) {
      $commentInput.val('');
      $commentInput.removeClass('error default');
    }
  });
  
  $('form.tip-form .tip-submit').mousedown(function() {
    if ($(this).parents('#promote-container').length) {
      testObject.uuid = $('input#comment-uuid').val();
      testObject.amount = parseFloat($('#promote-container input.tip-input').val().replace('$', ''));
    } else {
      testObject.uuid = '';
      testObject.amount = parseFloat($('#input-container input.tip-input').val().replace('$', ''));
    }
  });
  
  // INITIALIZATION
  
  getUserInfo();
  toggleIframeHeight(false);
  
});