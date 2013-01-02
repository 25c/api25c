$(function() {

  // CONSTANTS
  var MAX_USERS = 5;
  var IMAGE_WIDTH = 61;
  
  // STATE VARIABLES
  var beltUsers = [];
  var currentUser = {};
  
  // JQUERY OBJECTS
  var $users = $('#users');
  var $currentUser = $();
  
  // DEBUG
  var DEBUG_MODE = false;
  
  fakeCurrentUser = {
    uuid: 99,
    name: 'Joseph',
    pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/50bce640ec9a012fc7fa1231381d4d5a/thumb.jpg"
  };
  
  fakeBeltUsers = [
    {
      uuid: 100,
      amount: 10, 
      name: "Theodore", 
      pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/41c86070aebd012f4c7222000a8c4def/thumb.jpg"
    }, {
      uuid: 101, 
      amount: 5,
      name: "Cameron", 
      pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/71711960b355012f1c90123139080545/thumb.jpg"
    }, {
      uuid: 102, 
      amount: 6, 
      name: "David", 
      pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/79ca5a80d8f7012f6c8012313d04f26e/thumb.jpg"
    }, {
      uuid: 103,
      amount: 12, 
      name: "Eric", 
      pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/31a365c0b25e012f50491231381d2446/thumb.jpg"
    }, {
      uuid: 104, 
      amount: 3,
      name: "Frank", 
      pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/61b300c0b1d8012fff2112313b032602/thumb.jpg"
    }, {
      uuid: 105,
      amount: 5,
      name: "Gary", 
      pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/0d6174d0ec9a012fc7f71231381d4d5a/thumb.jpg"
    }
  ]

  // FUNCTIONS

  window.submitSuccessCallback = function(form, response) {
    currentUser.amount = currentUser.originalAmount + parseFloat(form.amount.replace('$', ''));
    updateUsers();
  };
  
  function initializeBelt(data) {
    if (DEBUG_MODE) {
      currentUser = fakeCurrentUser;
      beltUsers = fakeBeltUsers;
    } else {
      currentUser = data.user;
      beltUsers = data.widget || [];
    }
    populateUsers();
  }
  
  function sortFunction(a, b) {
    return(b.amount - a.amount);
  }

  function populateUsers() {
    
    var usersLoaded = 0;
    var containsCurrentUser = false;
    beltUsers.sort(sortFunction);
    beltUsers.length = MAX_USERS;
  
    for (i in beltUsers) {
      
      var user = beltUsers[i];
      
      if (user.uuid == currentUser.uuid) {
        containsCurrentUser = true;
        currentUser = user;
      }
      
      user.position = i;
      
      var $userImage = createUserImage(user);
      $users.append($userImage);
      $userImage.delay(500 + i * 500).fadeIn('slow');
      usersLoaded++;
    
    }
    
    if (!containsCurrentUser) {
      currentUser.amount = 0;
      currentUser.position = -1;
      beltUsers.push(currentUser);
      var $userImage = createUserImage(currentUser);
      $userImage.fadeOut();
      $users.append($userImage);
    }
    
    currentUser.originalAmount = currentUser.amount;
    
    if (usersLoaded > MAX_USERS) {
      $('#call-image').css({left: MAX_USERS * IMAGE_WIDTH}).delay(500 + usersLoaded * 500).fadeIn('slow');
    }
    
    if (usersLoaded > 0) {
      $('#call-message').hide();
    }
  }
  
  function createUserImage(user) {
    var position = user.position == -1 ? MAX_USERS : user.position;
    var $userImage = $('<div />', {
      id: user.uuid,
      class: 'user-image',
      'data-name': user.name,
      'data-amount': user.amount,
      'css': {
        left: position * IMAGE_WIDTH,
        'background-image': DEBUG_MODE ? 'url("' + user.pictureUrl + ')' :
          'url("' + window.usersUrlBase + '/users/pictures/' + user.uuid + '/thumb.jpg")'
      }
    });
    return $userImage;
  }

  function updateUsers() {
        
    $('#' + currentUser.uuid).attr('data-amount', currentUser.amount);

    beltUsers.sort(sortFunction);
    
    for (i in beltUsers) {
      var user = beltUsers[i];
      
      if (i >= MAX_USERS || user.amount == 0) {
        $('#' + user.uuid).fadeOut(500, function() {
          $(this).css({ left: IMAGE_WIDTH * MAX_USERS });
        });
        user.position = -1;
      } else if (user.position != i) {
        $('#' + user.uuid).show().animate({ opacity: 1, left: IMAGE_WIDTH * i }, 500);
        user.position = i;
      }
    }
  }

  $('#users').on({
    mouseenter: function() {
      var $this = $(this);
      $('#info-container').css({
        display: 'block',
        top: $this.position().top + 5,
        left: $this.position().left + $this.width() - 10
      }).html($this.attr('data-name') + ' tipped <span class="tip-amount">$' + (parseFloat($this.attr('data-amount')) / 100).toFixed(2) + '</span>');
    },
    mouseleave: function() {
      $('#info-container').hide();
    }, 
  }, '.user-image');
  
  // INITIALIZATION
  getWidgetCache(initializeBelt);
  
});