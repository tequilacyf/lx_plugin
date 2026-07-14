export const LX_PRELUDE_JS = `
'use strict';

globalThis.window = globalThis;
globalThis.global = globalThis;

var _hostBuffer = typeof Buffer !== 'undefined' ? Buffer : null;

var _lx = {
  _reqIdCounter: 0,
  _handlers: {},
  _eventHandlers: {},
  _inited: false,
  _sources: null,

  EVENT_NAMES: { request: 'request', inited: 'inited' },

  env: 'jsplugin',
  version: '1.0.0',

  request: function(url, options, callback) {
    if (typeof options === 'function') { callback = options; options = {}; }
    options = options || {};
    var method = (options.method || 'get').toUpperCase();
    var headers = {};
    for (var k in options.headers || {}) headers[k] = options.headers[k];
    var body = undefined;
    if (options.body) {
      if (typeof options.body === 'object' && !(options.body instanceof ArrayBuffer)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        body = JSON.stringify(options.body);
      } else {
        body = String(options.body);
      }
    } else if (options.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      var pairs = [];
      for (var key in options.form) {
        if (options.form.hasOwnProperty(key)) {
          pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(options.form[key] == null ? '' : String(options.form[key])));
        }
      }
      body = pairs.join('&');
    }
    fetch(url, { method: method, headers: headers, body: body })
      .then(function(resp) {
        return resp.text().then(function(text) {
          var respBody = text;
          try { respBody = JSON.parse(text); } catch(e) {}
          var respHeaders = {};
          if (resp.headers && typeof resp.headers.forEach === 'function') {
            resp.headers.forEach(function(v, k) { respHeaders[k] = v; });
          }
          callback(null, { statusCode: resp.status, statusMessage: resp.statusText, headers: respHeaders, body: respBody }, respBody);
        });
      }).catch(function(err) { callback(err, null, null); });
  },

  send: function(eventName, data) {
    if (eventName === 'inited') { _lx._inited = true; _lx._sources = data; }
    __go_send('lx_' + eventName, JSON.stringify(data));
  },

  on: function(eventName, handler) {
    if (!_lx._eventHandlers[eventName]) _lx._eventHandlers[eventName] = [];
    _lx._eventHandlers[eventName].push(handler);
  },

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
      if (!settled) { settled = true; __go_send('dispatchError', JSON.stringify({ id: reqId, error: 'Dispatch timeout (18s)' })); }
    }, 18000);
    function settle(result, isError) {
      if (settled) return; settled = true; clearTimeout(settleTimeout);
      if (isError) { __go_send('dispatchError', JSON.stringify({ id: reqId, error: String(result) })); }
      else { __go_send('dispatchResult', JSON.stringify({ id: reqId, result: result })); }
    }
    for (var i = 0; i < handlers.length; i++) {
      try {
        var ret = handlers[i](data);
        if (ret && typeof ret.then === 'function') { ret.then(function(r) { settle(r, false); }).catch(function(e) { settle(e, true); }); }
        else { settle(ret, false); }
      } catch(e) { settle(e, true); }
    }
  },

  utils: {
    buffer: typeof Buffer !== 'undefined' ? Buffer : {
      from: function(data, enc) {
        if (typeof data === 'string') { return new Uint8Array(data.length); }
        return new Uint8Array(data);
      },
    },
    crypto: typeof crypto !== 'undefined' ? crypto : {},
    zlib: typeof zlib !== 'undefined' ? zlib : {},
  },
};

globalThis.lx = _lx;
`
