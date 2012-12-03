$(function() {

  // CONSTANTS
  var MAX_USERS = 5;
  var IMAGE_WIDTH = 61;
  
  // STATE VARIABLES
  var users = [];
  var currentUser = {};
  
  // JQUERY OBJECTS
  var $users = $('#users');
  var $currentUser = $();

  // FUNCTIONS
  
  window.submitSuccessCallback = function(form, response) {
    currentUser.amount = parseFloat(form.amount.replace('$', ''));
    updateUsers();
  };
  
  function getUserInfo() {
    $.ajax({
      type: "POST",
      url: "/users/" + buttonUuid,
      data: {_csrf: sessionCsrf},
      success: function(data) {
        
        // if (!data.users) {
        //   // something went wrong
        // } else {
        //   currentUser = data.currentUser;
        //   users = data.users;
        //   populateUsers();
        // }
        
        // DEBUG
        currentUser = {
          uuid: 99,
          name: 'Joseph',
          pictureUrl: "https://s3.amazonaws.com/assets.plus25c.com/users/pictures/50bce640ec9a012fc7fa1231381d4d5a/thumb.jpg"
        };
        
        users = [
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
        
        // users = [];
        
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
    
    var usersLoaded = 0;
    var containsCurrentUser = false;
    users.sort(sortFunction);
    users.length = MAX_USERS;
  
    for (i in users) {
      
      var user = users[i];
      
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
      users.push(currentUser);
      var $userImage = createUserImage(currentUser);
      $userImage.fadeOut();
      $users.append($userImage);
    }
    
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
        'background-image': user.pictureUrl ? 
          'url(' + user.pictureUrl + ')'
          : 'url("' + assetsUrlBase + '/users/pictures/no_pic.png")'
      }
    });
    return $userImage;
  }

  function updateUsers() {
        
    $('#' + currentUser.uuid).attr('data-amount', currentUser.amount);

    users.sort(sortFunction);
    
    for (i in users) {
      var user = users[i];
      
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
      }).html($this.attr('data-name') + ' tipped <span class="tip-amount">$' + parseFloat($this.attr('data-amount')).toFixed(2) + '</span>');
    },
    mouseleave: function() {
      $('#info-container').hide();
    }, 
  }, '.user-image');

  
  getUserInfo();

  // DEBUG
  // setTimeout(function() {
  //   repositionUsers();
  // }, 5000);
});