export const LX_PRELUDE_JS = `
'use strict';

// Global setup for obfuscated scripts
globalThis.window = globalThis;
globalThis.global = globalThis;

// Buffer polyfill (from host)
var _hostBuffer = typeof Buffer !== 'undefined' ? Buffer : null;

// Utility: url-encode form data
function _urlEncode(obj) {
  return Object.entries(obj).map(function(pair) {
    return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1] == null ? '' : String(pair[1]));
  }).join('&');
}

// Utility: check if object
function _isObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

// lx namespace
var _lx = {
  _reqIdCounter: 0,
  _handlers: {},
  _eventHandlers: {},
  _inited: false,
  _sources: null,

  // Callback-style HTTP request (lx-music API)
  request: function(url, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    var method = (options.method || 'get').toUpperCase();
    var headers = Object.assign({}, options.headers || {});
    var body = undefined;

    if (options.body) {
      if (_isObject(options.body) && !(options.body instanceof ArrayBuffer)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        body = JSON.stringify(options.body);
      } else {
        body = String(options.body);
      }
    } else if (options.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = _urlEncode(options.form);
    } else if (options.formData) {
      // Build multipart/form-data
      var boundary = '----LxBoundary' + Date.now().toString(36);
      headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
      var parts = [];
      var fd = options.formData;
      if (_isObject(fd) && !(fd instanceof ArrayBuffer)) {
        for (var key in fd) {
          if (fd.hasOwnProperty(key)) {
            var val = fd[key];
            if (val && typeof val === 'object' && val.content) {
              // File-like: {content, filename, contentType}
              parts.push('--' + boundary + '\r\nContent-Disposition: form-data; name="' + key + '"; filename="' + (val.filename || key) + '"\r\nContent-Type: ' + (val.contentType || 'application/octet-stream') + '\r\n\r\n' + val.content + '\r\n');
            } else {
              parts.push('--' + boundary + '\r\nContent-Disposition: form-data; name="' + key + '"\r\n\r\n' + String(val == null ? '' : val) + '\r\n');
            }
          }
        }
      }
      body = parts.join('') + '--' + boundary + '--\r\n';
    }

    var controller = new AbortController();
    var timeoutId;
    if (options.timeout) {
      timeoutId = setTimeout(function() { controller.abort(); }, options.timeout);
    }

    fetch(url, {
      method: method,
      headers: headers,
      body: body,
      signal: controller.signal,
    }).then(function(resp) {
      if (timeoutId) clearTimeout(timeoutId);
      var rawText = resp.text();
      return rawText.then(function(text) {
        var respBody = text;
        try { respBody = JSON.parse(text); } catch(e) {}
        var respHeaders = {};
        resp.headers.forEach(function(v, k) { respHeaders[k] = v; });
        callback(null, {
          statusCode: resp.status,
          statusMessage: resp.statusText,
          headers: respHeaders,
          body: respBody,
        }, respBody);
      });
    }).catch(function(err) {
      if (timeoutId) clearTimeout(timeoutId);
      callback(err, null, null);
    });
  },

  // Send event to parent
  send: function(eventName, data) {
    if (eventName === 'inited') {
      _lx._inited = true;
      _lx._sources = data;
    }
    __go_send('lx_' + eventName, JSON.stringify(data));
  },

  // Register event handler
  on: function(eventName, handler) {
    if (!_lx._eventHandlers[eventName]) {
      _lx._eventHandlers[eventName] = [];
    }
    _lx._eventHandlers[eventName].push(handler);
  },

  // Internal: dispatch request from parent
  _dispatch: function(reqId, eventName, dataJSON) {
    var data;
    try { data = JSON.parse(dataJSON); } catch(e) { data = dataJSON; }
    
    var handlers = _lx._eventHandlers[eventName];
    if (!handlers || handlers.length === 0) {
      __go_send('dispatchError', JSON.stringify({ id: reqId, error: 'No handler for event: ' + eventName }));
      return;
    }

    var settled = false;
    var settleTimeout = setTimeout(function() {
      if (!settled) {
        settled = true;
        __go_send('dispatchError', JSON.stringify({ id: reqId, error: 'Dispatch timeout (18s)' }));
      }
    }, 18000);

    function settle(result, isError) {
      if (settled) return;
      settled = true;
      clearTimeout(settleTimeout);
      if (isError) {
        __go_send('dispatchError', JSON.stringify({ id: reqId, error: String(result) }));
      } else {
        __go_send('dispatchResult', JSON.stringify({ id: reqId, result: result }));
      }
    }

    for (var i = 0; i < handlers.length; i++) {
      try {
        var ret = handlers[i](data);
        if (ret && typeof ret.then === 'function') {
          ret.then(function(r) { settle(r, false); }).catch(function(e) { settle(e, true); });
        } else {
          settle(ret, false);
        }
      } catch(e) {
        settle(e, true);
      }
    }
  },

  // Utility wrappers
  utils: {
    buffer: typeof Buffer !== 'undefined' ? Buffer : {
      from: function(data, enc) {
        if (typeof data === 'string') {
          var binary = atob(data);
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return bytes;
        }
        return new Uint8Array(data);
      },
    },
    crypto: typeof crypto !== 'undefined' ? crypto : {},
    zlib: typeof zlib !== 'undefined' ? zlib : {},
  },
};

// Expose as global lx
globalThis.lx = _lx;
`
