var editor = ace.edit("editor")
editor.setTheme("ace/theme/chrome")
editor.getSession().setMode("ace/mode/javascript");
editor.setOption("showPrintMargin", false)
editor.$blockScrolling = Infinity
var editorContent = ""

var headerSuggestions = {
  "Content-Type": ['application/json', 'application/xml', 'text/html', 'text/plain', 'text/xml'],
  "Authorization": ['Bearer'],
  "Accept": ['application/json', 'application/xml', 'text/html', 'text/plain', 'text/xml'],
  "Accept_Language": ['en-US']
};

var methodTypes = ['GET', 'PUT', 'POST', 'DELETE']

var editorModes = [{
  value: 'text',
  name: 'Plain Text'
}, {
  value: 'json',
  name: 'JSON'
}, {
  value: 'xml',
  name: 'XML'
}]

function ViewModel() {
  var self = this;

  self.headers = ko.observableArray([{
    key: ko.observable(""),
    value: ko.observable("")
  }, ]);

  self.queryParams = ko.observableArray([{
    key: ko.observable(""),
    value: ko.observable("")
  }, ]);

  self.authentication = {
    "auth_necessary": ko.observable(true),
    "set_auth": function(bool) {
        return function(){
          self.authentication.auth_necessary(bool);
        }
    },
    "username": ko.observable(""),
    "password": ko.observable("")
  }

  self.editorMode = ko.observable("json")
  self.editorMode.subscribe(function() {
    editor.getSession().setMode("ace/mode/" + self.editorMode())
  });
  self.editorContent = ko.observable("")

  self.methodType = ko.observable("")
  self.url = ko.observable("")

  self.dataPayload = ko.observable("")

  self.saveSnip = function() {
    var qpms = []
    for (var i = 0; i < self.queryParams().length; i++) {
      qpms.push({
        key: self.queryParams()[i].key(),
        value: self.queryParams()[i].value()
      })
    }
    var hdrs = []
    for (var i = 0; i < self.headers().length; i++) {
      hdrs.push({
        key: self.headers()[i].key(),
        value: self.headers()[i].value()
      })
    }
    var dataObject = {
      headers: hdrs,
      queryParameters: qpms,
      username: self.username(),
      password: self.password(),
      dataPayload: editorContent,
      editorMode: self.editorMode(),
      methodType: self.methodType(),
      url: self.url()
    }
    $.ajax({
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(dataObject),
      dataType: 'json',
      url: '/saveSnippet',
      success: function(response) {
        window.history.pushState("", "", "/" + response.code)
      },
      error: function() {
        console.log("error occurred")
      }
    })
  }

  self.curlCommand = ko.computed(function() {
    headers = ""
    for (var i = 0; i < self.headers().length; i++) {
      if (self.headers()[i].key() != '' && self.headers()[i].value() != '') {
        headers += " --header \"" + self.headers()[i].key() + ": " + self.headers()[i].value() + "\"";
      }
    }

    var data = '';
    if(self.editorContent() != ''){
      data = '--data \'' + self.editorContent() + '\'';
    }

    var auth = '';
    if (self.authentication.username() != '') {
      auth = ' --user \'' + self.authentication.username() + ":" + self.authentication.password() + "\'";
    }

    queryparameters = '';
    if (self.queryParams().length>0 && self.queryParams()[0].key() != '') {
      queryparameters = "?";
    }
    for (var i = 0; i < self.queryParams().length; i++) {
      if (self.queryParams()[i].key() != '' && self.queryParams()[i].value() != '') {
        queryparameters += self.queryParams()[i].key() + "=" + self.queryParams()[i].value();
        if (i < self.queryParams().length - 1) {
          queryparameters += "&";
        }
      }
    }

    var url = ''
    if (self.url() != '') {
      url = "\"" + self.url() + queryparameters + "\"";
    }

    var method = " --request \"" + self.methodType() + "\" ";

    return "curl --verbose " + headers + data + auth + method + url
  })

  self.headers.getSuggestedValues = function(pair) {
    return ko.computed(function() {
      return headerSuggestions[pair.key()];
    });
  };

  // Callbacks
  self.headers.addHeader = function() {
    self.headers.push({
      key: ko.observable(''),
      value: ko.observable('')
    });
  }
  self.headers.removeHeader = function() {
    self.headers.remove(this)
  }

  self.queryParams.addQueryParam = function() {
    self.queryParams.push({
      key: ko.observable(''),
      value: ko.observable('')
    });
  }

  self.queryParams.removeQueryParam = function() {
    self.queryParams.remove(this)
  }

  editor.getSession().on('change', function(e) {
    self.editorContent(editor.getValue().replace(/[\n\t ]/g, ''))
  });

  self.formatText = function() {
    if (self.editorMode() == 'json') {
      editor.setValue(JSON.stringify(JSON.parse(editor.getValue()), null, '\t'));
    }
    if (self.editorMode() == 'xml') {
      editor.setValue(vkbeautify.xml(editor.getValue()));
    }
  }

  function checkForData() {
    $(document).ready(function() {
      url = document.URL
      var code = url.substr(url.length - 6);
      isACode = true;
      for (var i = 0; i < code.length; i++) {
        if (!$.isNumeric(code[i])) {
          //there is no code in the url.
          isACode = false;
          break;
        }
      }
      //Get JSON related to the code
      if (isACode == true) {
        $.post('/retrieveSnippet/' + code, function(data) {
          var curl = JSON.parse(data)
          console.log(curl)
          self.url(curl.url)
          self.editorMode(curl.editorMode)
          self.methodType(curl.methodType)
          self.username(curl.username)
          self.password(curl.password)
          editor.setValue(curl.dataPayload)

          self.headers().pop()
          for (var i = 0; i < curl.headers.length; i++) {
            self.headers.push({
              key: ko.observable(curl.headers[i].key),
              value: ko.observable(curl.headers[i].value)
            })

          }
          self.queryParams().pop()
          for (var i = 0; i < curl.queryParameters.length; i++) {
            self.queryParams.push({
              key: ko.observable(curl.queryParameters[i].key),
              value: ko.observable(curl.queryParameters[i].value)
            })
          }
        });
      }
    });
  }

  checkForData();

};

ko.applyBindings(new ViewModel());
