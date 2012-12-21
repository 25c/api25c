$(function() {

  // SETTINGS
  var START_INTERVAL = 400;
  
  // STATE VARIABLES
  var maxTip = 1;
  var minTip = 1;
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
  
  window.getWidgetCache = function(callback) {
    $.ajax({
      type: "POST",
      url: "/widget/" + buttonUuid + '?url=' + encodeURIComponent(buttonUrl),
      data: {referrer: parentUrl, _csrf: sessionCsrf},
      success: function(data) {
        if (data.user && data.user.isTipper) {
          maxTip = data.user.balance;          
          $('.balance-amount').text(pointString(maxTip));
          if (maxTip <= 0) {
            $('.tip-submit, input.tip-input, .tip-increase, .tip-decrease').addClass('disabled');
            $('input.tip-input').val(0);
          } else {
            // NOT LOGGED IN AS TIPPER
          }
        }
        callback(data);
      },
      dataType: "json",
      async: false
    });
  }
  
  function updateCount($form) {
    var $tipInput = $form.find('input.tip-input');
    var newTip = parseInt($tipInput.val());
    newTip = newTip + countState;
    if (maxTip <= 0) {
      newTip = 0;
    } else if (newTip > maxTip) {
      newTip = maxTip;
    } else if (newTip < minTip) {
      newTip = minTip;
    }
    $tipInput.val(newTip);
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
  
  function pointString(amount) {
    amount = parseInt(amount);
    var pointText = amount + ' point';
    pointText += amount == 1 ? '' : 's';
    return pointText;
  }
  
  function disableTip() {
    $('.tip-submit, input.tip-input, .tip-increase, .tip-decrease').addClass('disabled');
    $('input.tip-input').val(0);
  }
  
  // EVENT HANDLERS
  $('input.tip-input').change(function() {
    var $this = $(this);
    var newTip = parseInt($this.val());
    if (isNaN(newTip)) {
      newTip = 1;
    } else {
      if (newTip > maxTip) {
        newTip = maxTip;
      } else if (newTip < minTip) {
        newTip = minTip;
      }
    }
    $this.val(newTip);
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
    
    if (!window.validateTipForm($form)) {
      return false;
    }
    
    var $tipInput = $form.find('input.tip-input');
    var amount = parseInt($tipInput.val());
    var data = $form.serialize();
    
    var tipSuccess = function(data) {
      if (data.error) {
        // something went wrong
      } else {
        if (data.redirect) {
          var url = webUrlBase + '/tip/' + buttonUuid + '?referrer=' + encodeURIComponent(parentUrl);
          var width = 480;
          var height = 358;
          var left = (screen.width / 2) - (width / 2);
          var top = (screen.height / 2) - (height / 2);
          window.open(url, '25c', 'menubar=no,resizable=no,scrollbars=no,toolbar=no,width=' 
            + width + ',height=' + height + ',top=' + top + ',left=' + left);
        } else {
          window.submitSuccessCallback(processFormData($form), data);
          $form.find('.tip-confirm').show();
          $form.find('.tip-send').hide();
        }
        $form.find('.tip-amount').text(pointString(amount));
        maxTip = maxTip - amount;
        if (maxTip <= 0) {
          disableTip();
        }
        $('.balance-amount').text(pointString(data.balance));
        $form.find('input.tip-input').val(amount);
      }
    }
    
    if (window.DEBUG_MODE) {
      console.log($form.serialize());
      tipSuccess({comment_uuid: 999, balance: maxTip - amount});
      return false;
    }
            
    $.ajax({
      type: 'POST',
      url: $form.attr('action'),
      data: data,
      success: tipSuccess,
      dataType: 'json',
      async: false
    });
    return false;
  });
  
});