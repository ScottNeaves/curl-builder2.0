var editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
editor.getSession().setMode("ace/mode/javascript");
editor.setOption("showPrintMargin", false);
editor.$blockScrolling = Infinity;

function autoSelectURLContents(obj) {
    if (obj.value == "www.example.com") {
        obj.setSelectionRange(0, obj.value.length);
    }
}

var headerSuggestions = {
    "Content-Type": ['application/json', 'application/xml', 'text/html', 'text/plain', 'text/xml'],
    "Authorization": ['Bearer'],
    "Accept": ['application/json', 'application/xml', 'text/html', 'text/plain', 'text/xml'],
    "Accept_Language": ['en-US']
};

var methodTypes = ['GET', 'PUT', 'POST', 'DELETE'];

var editorModes = [{
    value: 'text',
    name: 'Plain Text'
}, {
    value: 'json',
    name: 'JSON'
}, {
    value: 'xml',
    name: 'XML'
}];

function ViewModel() {
    var self = this;

    self.uid = ko.observable("");
    self.url_has_uid = ko.computed(function() {
        return self.uid() !== "";
    });

    self.headers = ko.observableArray([{
        key: ko.observable(""),
        value: ko.observable("")
    }, ]);

    self.queryParams = ko.observableArray([{
        key: ko.observable(""),
        value: ko.observable("")
    }, ]);

    self.authentication = ko.observable({
        "auth_necessary": ko.observable(true),
        "set_auth": function(bool) {
            return function() {
                self.authentication().auth_necessary(bool);
                self.authentication().username("");
                self.authentication().password("");
            };
        },
        "username": ko.observable(""),
        "password": ko.observable("")
    });

    self.editorMode = ko.observable("json");
    self.editorMode.subscribe(function() {
        editor.getSession().setMode("ace/mode/" + self.editorMode());
    });
    self.editorContent = ko.observable("");

    self.methodType = ko.observable("");
    self.url = ko.observable("www.example.com");

    self.dataPayload = ko.observable("");


    self.saveCurl = function() {
        $.ajax({
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(self.serializeCurlAsJson()),
            dataType: 'json',
            url: '/save_curl',
            success: function(response) {
                if (!self.uid()) {
                    window.history.pushState("", "", "/curl/" + response.uid);
                    self.uid(response.uid);
                }
                toastr.success('Saved! See unique shareable URL above.');
            },
            error: function() {
                toastr.error('Something went wrong, please try again.');
            }
        });
    };

    self.curlCommand = ko.computed(function() {
        headers = "";
        for (var i = 0; i < self.headers().length; i++) {
            if (self.headers()[i].key() !== '' || self.headers()[i].value() !== '') {
                headers += " --header \"" + self.headers()[i].key() + ": " + self.headers()[i].value() + "\"";
            }
        }

        var data = '';
        if (self.editorContent() !== '') {
            data = ' --data \'' + self.editorContent() + '\'';
        }

        var auth = '';
        if (self.authentication().username() !== "" || self.authentication().password() !== "") {
            auth = ' --user \'' + self.authentication().username() + ":" + self.authentication().password() + "\'";
        }

        queryparameters = '';
        if (self.queryParams().length > 0 && self.queryParams()[0].key() !== '') {
            queryparameters = "?";
        }
        for (var j = 0; j < self.queryParams().length; j++) {
            if (self.queryParams()[j].key() !== '' || self.queryParams()[j].value() !== '') {
                queryparameters += self.queryParams()[j].key() + "=" + self.queryParams()[j].value();
                if (j < self.queryParams().length - 1) {
                    queryparameters += "&";
                }
            }
        }

        var url = '';
        if (self.url() !== '') {
            url = "\"" + self.url() + queryparameters + "\"";
        }

        var method = " --request \"" + self.methodType() + "\" ";

        return "curl --verbose " + headers + data + auth + method + url;
    });

    self.headers.getSuggestedValues = function(pair) {
        return ko.computed(function() {
            return headerSuggestions[pair.key()];
        });
    };

    self.headers.addHeader = function() {
        self.headers.push({
            key: ko.observable(''),
            value: ko.observable('')
        });
    };
    self.headers.removeHeader = function() {
        self.headers.remove(this);
    };

    self.queryParams.addQueryParam = function() {
        self.queryParams.push({
            key: ko.observable(''),
            value: ko.observable('')
        });
    };

    self.queryParams.removeQueryParam = function() {
        self.queryParams.remove(this);
    };

    editor.getSession().on('change', function(e) {
        self.editorContent(editor.getValue().replace(/[\n\t]/g, ''));
    });

    self.formatText = function() {
        if (self.editorMode() == 'json') {
            editor.setValue(JSON.stringify(JSON.parse(editor.getValue()), null, '\t'));
        }
        if (self.editorMode() == 'xml') {
            editor.setValue(vkbeautify.xml(editor.getValue()));
        }
    };

    self.serializeCurlAsJson = function() {
        var hdrs = [];
        for (var i = 0; i < self.headers().length; i++) {
            hdrs.push({
                key: self.headers()[i].key(),
                value: self.headers()[i].value()
            });
        }
        var qpms = [];
        for (var k = 0; k < self.queryParams().length; k++) {
            qpms.push({
                key: self.queryParams()[k].key(),
                value: self.queryParams()[k].value()
            });
        }
        return {
            uid: self.uid(),
            headers: hdrs,
            queryParameters: qpms,
            username: self.authentication().username(),
            password: self.authentication().password(),
            dataPayload: self.editorContent(),
            editorMode: self.editorMode(),
            methodType: self.methodType(),
            url: self.url()
        };
    };

    self.deserializeJson = function(curl) {
        self.uid(curl.uid);
        self.url(curl.url);
        self.editorMode(curl.editorMode);
        self.methodType(curl.methodType);
        self.authentication().username(curl.username);
        self.authentication().password(curl.password);
        editor.setValue(curl.dataPayload);

        self.headers().pop();
        for (var i = 0; i < curl.headers.length; i++) {
            self.headers.push({
                key: ko.observable(curl.headers[i].key),
                value: ko.observable(curl.headers[i].value)
            });
        }

        self.queryParams().pop();
        for (var n = 0; n < curl.queryParameters.length; n++) {
            self.queryParams.push({
                key: ko.observable(curl.queryParameters[n].key),
                value: ko.observable(curl.queryParameters[n].value)
            });
        }
    };

    self.copyCurl = function() {
        var curl_cmd = document.querySelector('#curl_cmd');
        try {
            if (!self.iOS()){
              //Copying to clipboard from javascript does not work on iOS: http://stackoverflow.com/questions/34045777/copy-to-clipboard-using-javascript-in-ios
              curl_cmd.select();
              document.execCommand('copy');
              curl_cmd.blur();
              toastr.success('Curl command saved to clipboard!');
            }
        } catch (err) {
            console.log("Copying to clipboard unsuccessful. Error: " + err.message)
        }
    }

    self.get_uid = function() {
        url = document.URL;
        uid = url.substr(url.length - 16);
        return /[a-zA-Z0-9]{16}$/.test(uid) ? uid : null;
    };

    function checkForData() {
        if (self.get_uid()) {
            $.get('/retrieve_curl/' + self.get_uid(), function(data) {
                if (data.error) {
                    console.log(data);
                } else {
                    self.deserializeJson(data);
                }
            });
        }
    }

    function setUniversalAttributes() {
        $.merge($('input'), $('textarea')).each(function() {
            $(this).attr('autocapitalize', 'none');
            $(this).attr('autocorrect', 'off');
            $(this).attr('spellcheck', 'false')
        })
    }

    function fix_iOS_AutoScrollProblem() {
      //All this craziness is necessary because iOS chrome and iOS Safari both mysteriously
      //cause the window to be scrolled all the way back up to the top after the user
      //clicks on the ace editor. This code scrolls it back down, making for a slightly
      //confusing flicker, but this is the best I've got right now.
        if (self.iOS()) {
            $('.ace_editor').bind('focusin focus', function(e) {
                var editor = document.getElementById('editor-row');
                var position = getOffsetRect(editor);
                window.scrollTo(0, position.top);
            })
        }
    }

    self.iOS = function() {
        var iDevices = [
            'iPad Simulator',
            'iPhone Simulator',
            'iPod Simulator',
            'iPad',
            'iPhone',
            'iPod'
        ];

        if (!!navigator.platform) {
            while (iDevices.length) {
                if (navigator.platform === iDevices.pop()) {
                    return true;
                }
            }
        }

        return false;
    }

    function getOffsetRect(elem) {
        //Taken from this excellent tutorial on javascript coordinates: http://javascript.info/tutorial/coordinates
        var box = elem.getBoundingClientRect()
        var body = document.body
        var docElem = document.documentElement
        var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop
        var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft
        var clientTop = docElem.clientTop || body.clientTop || 0
        var clientLeft = docElem.clientLeft || body.clientLeft || 0
        var top = box.top + scrollTop - clientTop
        var left = box.left + scrollLeft - clientLeft
        return {
            top: Math.round(top),
            left: Math.round(left)
        }
    }


    function initialize() {
        $(document).ready(function() {
            checkForData();
            setUniversalAttributes();
            fix_iOS_AutoScrollProblem();
        });
    }
    initialize();
}


ko.applyBindings(new ViewModel());
