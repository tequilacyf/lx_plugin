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

  request: function(url, options, callback) {
    if (typeof options === 'function') { callback = options; options = {}; }
    options = options || {};
    var method = (options.method || 'get').toUpperCase();
    var body = undefined;
    if (options.body) {
      if (typeof options.body === 'object' && !(options.body instanceof ArrayBuffer)) {
        body = JSON.stringify(options.body);
      } else {
        body = String(options.body);
      }
    } else if (options.form) {
      body = Object.entries(options.form).map(function(p) {
        return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1] == null ? '' : String(p[1]));
      }).join('&');
    }
    fetch(url, { method: method, headers: options.headers || {}, body: body })
      .then(function(resp) {
        return resp.text().then(function(text) {
          var respBody = text;
          try { respBody = JSON.parse(text); } catch(e) {}
          callback(null, { statusCode: resp.status, statusMessage: resp.statusText, headers: resp.headers, body: respBody }, respBody);
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
    if (!handlers || handlers.length === 0) return;
    for (var i = 0; i < handlers.length; i++) {
      try { handlers[i](data); } catch(e) {}
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
