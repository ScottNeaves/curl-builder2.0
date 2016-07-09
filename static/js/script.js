var editor = ace.edit("editor")
editor.setTheme("ace/theme/chrome")
editor.getSession().setMode("ace/mode/javascript");
editor.setOption("showPrintMargin", false)
var editorContent = ""

var AnimalDict = {
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
  self.dataPayload = ko.observable("")
  self.methodType = ko.observable("")
  self.url = ko.observable("")
  self.queryParams = ko.observableArray([{
    key: ko.observable(""),
    value: ko.observable("")
  }, ]);
  self.editorMode = ko.observable("json")
  self.editorMode.subscribe(function() {
    editor.getSession().setMode("ace/mode/" + self.editorMode())
  });
  self.username = ko.observable("")
  self.password = ko.observable("")
  self.editorContentObservable = ko.observable("")
  editor.getSession().on('change', function(e) {
    editorContent = editor.getValue()
    self.editorContentObservable(editorContent)
    editorContent = editorContent.replace(/[\n\t ]/g, '');
    self.editorContentObservable(editorContent)
    if (self.editorContentObservable() != '') {
      self.editorContentObservable('--data ' + self.editorContentObservable())
    }
  });
  self.formatText = function() {
    if (self.editorMode() == 'json') {
      editor.setValue(JSON.stringify(JSON.parse(editorContent), null, '\t'));
      //editor.setValue(vkbeautify.json(editorContent));
    }
    if (self.editorMode() == 'xml') {
      editor.setValue(vkbeautify.xml(editorContent));
    }
  }
  self.headers = ko.observableArray([{
    key: ko.observable(""),
    value: ko.observable("")
  }, ]);

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
    this.queryParameters = ''
    if (self.queryParams()[0].key() != '') {
      this.queryParameters = "?"
    }
    for (var i = 0; i < self.queryParams().length; i++) {
      if (self.queryParams()[i].key() != '' && self.queryParams()[i].value() != '') {
        this.queryParameters = this.queryParameters + self.queryParams()[i].key() + "=" + self.queryParams()[i].value()
        if (i < self.queryParams().length - 1) {
          this.queryParameters = this.queryParameters + "&"
        } else {
          this.queryParameters = this.queryParameters
        }
      }
    }
    this.headers = ""
    for (var i = 0; i < self.headers().length; i++) {
      if (self.headers()[i].key() != '' && self.headers()[i].value() != '') {
        this.headers = this.headers + " --header \"" + self.headers()[i].key() + ": " + self.headers()[i].value() + "\""
      }
    }

    var authString = '';
    if (self.username() != '') {
      authString = ' --user \'' + self.username() + ":" + self.password() + "\'"
    }

    var urlString = ''
    if (self.url() != '') {
      urlString = "\"" + self.url() + "\""
    }

    return "curl --verbose " + this.headers + self.editorContentObservable() + authString + " --request \"" + self.methodType() + "\" " + self.url() + this.queryParameters
  })

  self.headers.getSuggestedValues = function(pair) {
    return ko.computed(function() {
      return AnimalDict[pair.key()];
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

  function checkForData() {
    $(document).ready(function() {
      console.log("In function")
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
        console.log('I got here')
        $.post('/retrieveSnippet/' + code, function(data) {
          var curl = JSON.parse(data)
          console.log(curl)
          self.url(curl.url)
          self.editorMode(curl.editorMode)
          self.methodType(curl.methodType)
          self.username(curl.username)
          self.password(curl.password)
          //editorContent = curl.dataPayload
          editor.setValue(curl.dataPayload)
          //console.log('editorContent is now: ' + editorContent)
          //console.log(curl.headers.length)
          self.headers().pop()
          for (var i = 0; i < curl.headers.length; i++) {
            self.headers.push({
              key: ko.observable(curl.headers[i].key),
              value: ko.observable(curl.headers[i].value)
            })
            //console.log('hdrs key is ' + curl.headers[i].key)
            //console.log('hdrs value is ' + curl.headers[i].value)
          }
          self.queryParams().pop()
          for (var i = 0; i < curl.queryParameters.length; i++) {
            self.queryParams.push({
              key: ko.observable(curl.queryParameters[i].key),
              value: ko.observable(curl.queryParameters[i].value)
            })
            //console.log('qpms key is ' + curl.queryParameters[i].key)
            //console.log('qpms value is ' + curl.queryParameters[i].value)
          }
          //Headers, query parameters, and dataPayload don't work right now
        });
      }
    });
  }

  checkForData();

};

ko.applyBindings(new ViewModel());
