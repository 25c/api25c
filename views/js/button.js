$(function() {

  // SETTINGS
  var START_INTERVAL = 400;
  
  // STATE VARIABLES
  var maxTip = 10;
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
        if (data.user) {
          maxTip = data.user.balance;
          var pointText = ' ' + maxTip + ' point';
          pointText += maxTip == 1 ? '' : 's';
          $('.balance-amount').text(pointText);
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
    if (newTip > maxTip) {
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
    var $tipInput = $form.find('input.tip-input');
    var amount = parseInt($tipInput.val());
    var pointText = amount + ' point';
    pointText += amount == 1 ? '' : 's';

    if (!window.validateTipForm($form)) {
      return false;
    }
    
    if (testButton) {
      console.log($form.serialize());
      $form.find('.tip-amount').text(pointText);
      $form.find('.tip-confirm').show();
      $form.find('.tip-send').hide();
      window.submitSuccessCallback(processFormData($form));
      return false;
    }
        
    var data = $form.serialize();
        
    $.ajax({
      type: 'POST',
      url: $form.attr('action'),
      data: data,
      success: function(data) {
        if (data.redirect) {
          var url = webUrlBase + '/tip/' + buttonUuid + '?referrer=' + encodeURIComponent(parentUrl);
          var width = 480;
          var height = 358;
          var left = (screen.width / 2) - (width / 2);
          var top = (screen.height / 2) - (height / 2);
          window.open(url, '25c', 'menubar=no,resizable=no,scrollbars=no,toolbar=no,width=' + width + ',height=' + height + ',top=' + top + ',left=' + left);
        } else {
          window.submitSuccessCallback(processFormData($form), data);
          $form.find('.tip-confirm').show();
          $form.find('.tip-send').hide();
        }
        $form.find('.tip-amount').text(pointText);
        $form.find('input.tip-input').val(amount);
      },
      dataType: 'json',
      async: false
    });
    return false;
  });
  
});