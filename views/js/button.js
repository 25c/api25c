// DEBUG
window.testButton = true;

$(function() {

  // SETTINGS
  var MAX_TIP = 99.75;
  var MIN_TIP = 0.25;
  var START_INTERVAL = 400;
  
  // STATE VARIABLES
  var countState = 0;
  var timer = null;
  var interval = START_INTERVAL;
  
  // FUNCTIONS
  
  // DEFAULT VALIDATE FORM (overwritten by widget specific JS)
  window.validateTipForm = function() {
    return true;
  }
  
  // DEFAULT SUCCESS CALLBACK AFTER TIP SENT (overwritten by widget specific JS)
  window.submitSuccessCallback = function(data) {
    return true;
  }
  
  function updateCount($form) {
    var $tipInput = $form.find('input.tip-input');
    var newTip = parseFloat($tipInput.val().replace('$', ''));
    newTip = Math.floor(newTip * 4 + countState) / 4;
    if (newTip > MAX_TIP) {
      newTip = MAX_TIP;
    } else if (newTip < MIN_TIP) {
      newTip = MIN_TIP;
    }
    $tipInput.val('$' + newTip.toFixed(2));
  }

  function tipCounter($form) {
    if (countState != 0) {
      updateCount($form);
      clearTimeout(timer);
      timer = setTimeout(function() {
        if (countState != 0) {
          if (interval > 100) interval = interval - 20;
          tipCounter($form);
        }
      }, interval);
    } else {
      clearTimeout(timer);
      interval = START_INTERVAL;
    }
  }
  
  function processFormData($form) {
    var formArray = $form.serializeArray();
    var formData = {};
    for (i in formArray) {
      formData[formArray[i].name] = formArray[i].value;
    }
    return formData;
  }
  
  // EVENT HANDLERS
  
  $('input.tip-input').change(function() {
    var $this = $(this);
    var newTip = parseFloat($this.val().replace('$', ''));
    if (isNaN(newTip)) {
      newTip = 0.25;
    } else {
      if (newTip > MAX_TIP) {
        newTip = MAX_TIP;
      } else if (newTip < MIN_TIP) {
        newTip = MIN_TIP;
      }
    }
    $this.val('$' + newTip.toFixed(2));
  });
        
  $('.tip-increase, .tip-decrease').bind('mousedown touchstart', function() {
    
    var $this = $(this);
    var $form = $this.parents('form.tip-form');
    
    $this.addClass('active');
    if ($this.hasClass('tip-increase')) {
      countState = 1;
    } else {
      countState = -1;
    }
    
    updateCount($form);
    clearTimeout(timer);
    timer = setTimeout(function() {
      if (countState != 0) {
        tipCounter($form);
      }
    }, 1000);
  }).bind('contextmenu', function() {
    if (countState != 0) {
      clearTimeout(timer);
      countState = 0;
      $('.active').removeClass('active');
    }
  });
  
  $('.tip-submit').bind('mousedown touchstart', function() {
    $(this).addClass('active');
  });

  $(document).bind('mouseup touchend', function() {
    $('.active').removeClass('active');
    countState = 0;
  });
  
  $('.tip-update').click(function() {
    var $form = $(this).parents('form.tip-form');
    $form.find('.tip-send').show();
    $form.find('.tip-confirm').hide();
  });
  
  $('.tip-submit').click(function() {
    $(this).parents('form.tip-form').submit();
  });
  
  $('form.tip-form').submit(function() {
    
    var $form = $(this);
    var $tipInput = $form.find('input.tip-input');

    if (!window.validateTipForm($form)) {
      return false;
    }
    
    if (testButton) {
      // populateUsers();
      console.log($form.serialize());
      $form.find('.tip-amount').text($tipInput.val());
      $form.find('.tip-confirm').show();
      $form.find('.tip-send').hide();
      window.submitSuccessCallback(processFormData($form));
      return false;
    }
    
    $tipInput.val($tipInput.val().replace('$', ''));
    var data = $form.serialize();
    
    $.ajax({
      type: 'POST',
      url: $form.attr('action'),
      data: data,
      success: function(data) {
        if (data.clear) {
          //
        } else if (data.redirect) {
          var url = webUrlBase + '/tip/' + buttonUuid + '?referrer=' + encodeURIComponent(parentUrl);
          if (data.overdraft) {
            url = url + '&overdraft=true';
          } else {
            resetCount();
          }
          var width = 480;
          var height = 358;
          var left = (screen.width / 2) - (width / 2);
          var top = (screen.height / 2) - (height / 2);
          window.open(url, '25c', 'menubar=no,resizable=no,scrollbars=no,toolbar=no,width=' + width + ',height=' + height + ',top=' + top + ',left=' + left);
        } else {
          //
        }
      },
      dataType: 'json',
      async: false
    });
    return false;
  });
});