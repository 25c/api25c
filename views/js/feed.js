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
  var $feedExpand = $('#feed-expand');
  var $promoteContainer = $('#promote-container');
  var $feedContainer = $('#feed-container');
  var $infoContainer = $('info-container');
  
  // TEXT
  var DEFAULT_COMMENT = $commentInput.val();
  var ERROR_COMMENT = "Please enter a comment.";
  
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
      promoters: [
        {uuid: 106, amount: 25, name: "Alice", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/e4788250f48e012f6e12123139081365/thumb.jpg"},
        {uuid: 107, amount: 25, name: "Ann", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/22cf6310d918012ff891123138152cb3/thumb.jpg"}
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
      owner: {uuid: 102, amount: 25, name: "Carl", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/4fe81770f48b012f49af1231381554d7/thumb.jpg"},
      promoters: [
        {uuid: 109, amount: 25, name: "Charlotte", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/50bce640ec9a012fc7fa1231381d4d5a/thumb.jpg"},
        {uuid: 110, amount: 2, name: "Cameron", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/57853590de7f012fca7512313d13fc17/thumb.jpg"},
        {uuid: 111, amount: 25, name: "Carol", pictureUrl: ""},
        {uuid: 112, amount: 25, name: "Cher", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/988e1d90de80012fca7b12313d13fc17/thumb.jpg"},
        {uuid: 113, amount: 25, name: "Cesaria", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/a89f3870b439012f99ca12313809465c/thumb.jpg"},
        {uuid: 114, amount: 25, name: "Claire", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/71711960b355012f1c90123139080545/thumb.jpg"},
        {uuid: 115, amount: 25, name: "Chloe", pictureUrl: ""},
        {uuid: 116, amount: 25, name: "Christine", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/71711960b355012f1c90123139080545/thumb.jpg"}
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
      amount: 100,
      text: "Check out my great response to this article on my personal blog: http://www.something.com/",
      owner: {uuid: 104, amount: 25, name: "Eric", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/71711960b355012f1c90123139080545/thumb.jpg"},
      promoters: []
    },
    {
      uuid: 1005,
      amount: 60,
      text: "Great job!",
      owner: {uuid: 105, amount: 25, name: "Frank", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/79ca5a80d8f7012f6c8012313d04f26e/thumb.jpg"},
      promoters: [
        {uuid: 117, amount: 25, name: "Flore", pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/7b6fd560aed4012fd5e0123139180e6a/thumb.jpg"}
      ]
    }
  ];

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
    // response = {uuid: '999'};
    
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
      }
      newComment.content = form.comment_text;
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
        'background-image': DEBUG_MODE ? 'url("' + user.pictureUrl + ')' :
        'url("' + window.usersUrlBase + '/users/pictures/' + user.uuid + '/thumb.jpg")'
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

    for (i in comments) {
      if (newComment.amount > comments[i].amount && comments[i].uuid != newComment.uuid) {
        nextCommentUuid = comments[i].uuid;
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
      $feedContainer.append($feedItem);
    }
    
    if (promoteVisible) {
      $feedItem.after($promoteContainer);
    }
    
    $feedItem.addClass('initial').delay(3000).animate({ backgroundColor: "transparent" }, "slow");
    toggleIframeHeight(isExpanded);
  }
  
  function createFeedItem(comment) {
    // TODO: make sure to show original tip amount, not total comment amount, in givenText
    var givenText = comment.owner.name + ' gave <span class="tip-amount">' + comment.amount;
    givenText += parseInt(comment.amount) > 1 ? ' points</span>' : ' point</span>';
    var $itemImage = $('<div />', {
      'data-given': givenText,
      class: 'item-image',
      css: {
        'background-image': DEBUG_MODE ? 'url("' + comment.owner.pictureUrl + ')' :
          'url("' + window.usersUrlBase + '/users/pictures/' + comment.owner.uuid + '/thumb.jpg")'
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
      'data-href': 'http://localhost:5000/feed/4f4243c020860130a45048bcc89ac444/' + comment.uuid,
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
      var givenText = promoter.name + ' gave <span class="tip-amount">' + promoter.amount;
      givenText += parseInt(promoter.amount) > 1 ? ' points</span>' : ' point</span>';
      $itemPromoters.append($('<div />', {
        'data-given': givenText,
        class: 'promoter-image',
        css: DEBUG_MODE ? {'background-image': 'url("' + comment.owner.pictureUrl + ')'} :
          {'background-image': 'url("' + window.usersUrlBase + '/users/pictures/' + comment.owner.uuid + '/thumb.jpg")'}
      }));
    }
    $itemPromoters.append($('<div class="clear"></div>'));
    return $itemPromoters;
  }
  
  function toggleIframeHeight(expandIframe) {
    if (comments.length > DEFAULT_SHOW) {
      $feedContainer.css('margin-bottom', 30);
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
        if ($lastDefaultShown.length) {
          var newHeight = $lastDefaultShown.offset().top + $lastDefaultShown.height() + 60;
          $feedExpand.show();
        } else {
          var newHeight = $('#outer-container').height() + 30;
        }
        $feedExpand.css({
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
    } else {
      $feedContainer.css('margin-bottom', '');
      $feedExpand.hide();
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
        }).find('#comment-uuid').val(uuid);
      } else {
        $promoteContainer.hide();
      }
    }
  }, '.item-promote-container');
  
  $('#promote-container').hover(function() {
    }, function() {

  });
  
  var inputDefaultText = $commentInput.val();
  
  $feedExpand.click(function() {
    toggleIframeHeight(!isExpanded);
  });
  
  $commentInput.focus(function() {
    var comment = $commentInput.val();
    if (comment == DEFAULT_COMMENT || comment == ERROR_COMMENT) {
      $commentInput.val('');
      $commentInput.removeClass('error default');
    }
  });
    
  // INITIALIZATION
  getWidgetCache(initializeComments);
  toggleIframeHeight(false);
  
});