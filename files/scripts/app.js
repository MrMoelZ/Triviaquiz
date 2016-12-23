(function () { 'use strict'

  var getData = function() {
    console.log('getdata');
  }
  var createApp = function () {
    // ---------------------
    // BEGIN NORMAL APP CODE
    // ---------------------
    // Main Vue instance must be returned and have a root
    // node with the id "app", so that the client-side
    // version can take over once it loads.
     Vue.component('test', {
        template: '<div>test!</div>'
      });
      getData();

    return new Vue({
      template: '<div id="app"><test></test><span>You</span> have been here for {{ counter }} seconds.</div>',
      data: {
        counter: 0,
        navData:'Here be nav'
      },
      created: function () {
        var vm = this
        setInterval(function () {
          vm.counter += 1
        }, 1000)
      }
    });
  }


    // -------------------
    // END NORMAL APP CODE
    // -------------------

    console.log('this is app.js');
    //getData();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = createApp
  } else {
    this.app = createApp()
  }
}).call(this)
