// Generated by CoffeeScript 1.6.2
(function() {
  var Barcode, Capture, HTTPParser, Packet, Palette, StackedArea, Stream, Transaction, load_hints, packet_begin_time, truncate,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  truncate = function(maxlength, str) {
    if (str.length <= maxlength) {
      return str;
    } else {
      return str.substr(0, maxlength - 1) + '...';
    }
  };

  window.Barcode = Barcode = (function() {
    var margin;

    margin = 0.1;

    function Barcode(svg) {
      this.svg = d3.select(svg);
    }

    Barcode.prototype.download = function(format) {
      var blob, img, xml,
        _this = this;

      xml = this.svg.node().parentNode.innerHTML.replace(/^\s*<!--\s*([\s\S]*)-->\s*<svg/, '$1\n<svg');
      blob = new Blob([xml], {
        type: "image/svg+xml"
      });
      if (format === 'svg') {
        saveAs(blob, "http-vis.svg");
      } else if (format === 'png') {
        img = new Image();
        img.onload = function() {
          var canvas, ctx;

          window.URL.revokeObjectURL(img.src);
          canvas = document.getElementById("canvas");
          canvas.width = _this.svg[0][0].clientWidth;
          canvas.height = _this.svg[0][0].clientHeight;
          ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          return canvas.toBlob(function(blob) {
            return saveAs(blob, "http-vis");
          });
        };
        img.src = window.URL.createObjectURL(blob);
      }
      return false;
    };

    Barcode.prototype.draw = function(capture, palette, bandwidth) {
      var as, bars, capture_begin, capture_duration, draw_packets, duration, em, packets, scale, streams, svg_dom, transaction_y, transactions, wireshark_begin,
        _this = this;

      packets = capture.packets_in();
      duration = function(packet) {
        return packet.size / bandwidth;
      };
      capture_begin = capture.begin(bandwidth);
      capture_duration = capture.duration(bandwidth);
      wireshark_begin = capture.packets[0].timestamp;
      scale = d3.scale.linear().domain([0, capture.end() - capture_begin]).range(['0%', '100%']);
      draw_packets = function(stripes, y, height) {
        stripes.enter().append('rect').attr('height', height);
        stripes.attr('packet-id', function(packet) {
          return packet.id;
        }).attr('x', function(packet) {
          return scale(packet.timestamp - duration(packet) - capture_begin);
        }).attr('y', y).attr('width', function(packet) {
          return scale(duration(packet));
        }).attr('class', function(packet) {
          return 'color-' + palette.color(packet.transaction);
        });
        return stripes.exit().remove();
      };
      draw_packets(this.svg.select('#packets').selectAll('rect').data(packets), 0, '100%');
      transactions = capture.transactions.filter(function(t) {
        return (t.request && t.response) || console.error('incomplete transaction:', t);
      });
      streams = capture.streams.filter(function(stream) {
        return stream.transactions.length !== 0;
      });
      transaction_y = function(transaction) {
        return 2 * margin + (1 + 2 * margin) * (streams.indexOf(transaction.stream));
      };
      bars = this.svg.select('#transactions').selectAll('a').data(transactions);
      as = bars.enter().append('a');
      as.append('title');
      as.append('rect').attr('class', 'transaction-bar').attr('height', '1em');
      as.append('rect').attr('class', 'request').attr('height', '1em');
      as.append('g').attr('class', 'packets');
      bars.attr('transaction-id', function(t) {
        return t.id;
      }).attr('xlink:href', function(t) {
        return t.request.url;
      });
      bars.each(function(t) {
        return draw_packets(d3.select(this).select('g.packets').selectAll('rect').data(t.packets_in), transaction_y(t) + 0.1 + 'em', '0.8em');
      });
      bars.select('title').text(function(t) {
        return ("TCP#" + t.stream.id + " (" + t.stream.domain + ")\n") + ("HTTP#" + t.id + " (" + (truncate(20, t.request.url.substr(t.request.url.lastIndexOf('/') + 1))) + ")\n") + ("begin: " + ((t.request_begin(bandwidth) - wireshark_begin).toFixed(2)) + "s\n") + ("sending: " + (Math.round(t.request_duration(bandwidth) * 1000)) + "ms\n") + ("waiting: " + (Math.round((t.response_begin(bandwidth) - t.request_end()) * 1000)) + "ms\n") + ("receiving: " + (Math.round(t.response_duration(bandwidth) * 1000)) + "ms");
      });
      bars.select('rect.transaction-bar').attr('x', function(t) {
        return scale(t.begin(bandwidth) - capture_begin);
      }).attr('y', function(t) {
        return transaction_y(t) + 'em';
      }).attr('width', function(t) {
        return scale(t.response_end() - t.begin(bandwidth));
      });
      bars.select('rect.request').attr('x', function(t) {
        return scale(t.request_begin(bandwidth) - capture_begin);
      }).attr('y', function(t) {
        return transaction_y(t) + 'em';
      }).attr('width', function(t) {
        return scale(t.response_begin(bandwidth) - t.request_begin(bandwidth));
      });
      bars.exit().remove();
      em = Number(getComputedStyle(bars[0][0], "").fontSize.match(/(\d*(\.\d*)?)px/)[1]);
      this.svg.attr('height', (2 * margin + streams.length * (1 + 2 * margin)) * em + 105 + 'px');
      svg_dom = this.svg[0][0];
      this.svg.on('mousemove', function() {
        var event, time;

        event = d3.event;
        time = capture_begin + capture_duration * (event.clientX + window.scrollX - svg_dom.offsetLeft) / svg_dom.clientWidth - wireshark_begin;
        return _this.onmousemove(time);
      });
      return this.svg.on('mouseover', function() {
        var packet, packet_id, stream, transaction, transaction_id;

        packet_id = d3.event.target.getAttribute('packet-id');
        transaction_id = d3.event.target.parentNode.getAttribute('transaction-id');
        if (packet_id !== null) {
          packet = capture.capture.packets[packet_id];
          transaction = packet.transaction;
          stream = transaction.stream;
          return _this.onmouseover(stream, transaction, packet);
        } else if (transaction_id !== null) {
          transaction = capture.capture.transactions[transaction_id];
          stream = transaction.stream;
          return _this.onmouseover(stream, transaction);
        } else {
          return _this.onmouseover();
        }
      });
    };

    Barcode.prototype.onmousemove = function(time) {};

    Barcode.prototype.onmouseover = function(stream, transaction, packet) {};

    return Barcode;

  })();

  Packet = window.Packet;

  HTTPParser = window.HTTPParser;

  packet_begin_time = function(packet, bandwidth) {
    return packet.timestamp - packet.size / bandwidth;
  };

  window.Capture = Capture = (function() {
    function Capture(pcap) {
      var begin, e, tcp_tracker,
        _this = this;

      this.capture = this;
      this.pcap = new Packet.views.PcapFile(pcap);
      this.streams = [];
      this.transactions = [];
      this.packets = [];
      begin = void 0;
      tcp_tracker = Packet.stream.tcp();
      tcp_tracker.on('connection', function(ab, ba, connection) {
        var stream;

        stream = new Stream(_this, ab, ba, connection);
        return stream.id = _this.streams.push(stream) - 1;
      });
      try {
        this.pcap.packets.forEach(function(packet) {
          packet.id = _this.packets.push(packet) - 1;
          packet.timestamp = packet.ts_sec + packet.ts_usec / 1000000;
          if (begin == null) {
            begin = packet.timestamp;
          }
          packet.relative_timestamp = packet.timestamp - begin;
          return tcp_tracker.write(packet);
        });
        tcp_tracker.end();
        if (this.pcap.packets.length === 0) {
          throw 'No packets in file';
        }
      } catch (_error) {
        e = _error;
        alert('File parsing error. Make sure the file is in libpcap (and not pcapng) format.');
        throw e;
      }
    }

    Capture.prototype.filter = function(client, server) {
      var filtered;

      filtered = Object.create(Capture.prototype);
      filtered.capture = this.capture;
      filtered.pcap = this.pcap;
      filtered.streams = this.streams.filter(function(stream) {
        return (!client || stream.src.ip === client) && (!server || stream.dst.address === server);
      });
      filtered.transactions = this.transactions.filter(function(transaction) {
        var _ref;

        return _ref = transaction.stream, __indexOf.call(filtered.streams, _ref) >= 0;
      });
      filtered.packets = this.packets.filter(function(packet) {
        var _ref;

        return _ref = packet.transaction, __indexOf.call(filtered.transactions, _ref) >= 0;
      });
      return filtered;
    };

    Capture.prototype.clients = function() {
      var stream;

      return _.uniq((function() {
        var _i, _len, _ref, _results;

        _ref = this.streams;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          stream = _ref[_i];
          if (stream.transactions.length !== 0) {
            _results.push(stream.src.ip);
          }
        }
        return _results;
      }).call(this));
    };

    Capture.prototype.servers = function() {
      var stream;

      return _.uniq((function() {
        var _i, _len, _ref, _results;

        _ref = this.streams;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          stream = _ref[_i];
          if (stream.transactions.length !== 0) {
            _results.push(stream.dst.address);
          }
        }
        return _results;
      }).call(this));
    };

    Capture.prototype.packets_in = function() {
      return this.packets.filter(function(packet) {
        return __indexOf.call(packet.transaction.packets_in, packet) >= 0;
      });
    };

    Capture.prototype.packets_out = function() {
      return this.packets.filter(function(packet) {
        return __indexOf.call(packet.transaction.packets_out, packet) >= 0;
      });
    };

    Capture.prototype.begin = function(bandwidth) {
      return packet_begin_time(this.packets[0], bandwidth);
    };

    Capture.prototype.end = function() {
      return this.packets[this.packets.length - 1].timestamp;
    };

    Capture.prototype.duration = function(bandwidth) {
      return this.end() - this.begin(bandwidth);
    };

    Capture.prototype.bandwidth = function() {
      var current_bandwidth, max_bandwidth, packets, window_begin, window_bytes, window_end, window_size, _i, _ref;

      packets = this.packets_in();
      window_size = 0.3;
      window_begin = 0;
      window_bytes = 0;
      max_bandwidth = 0;
      for (window_end = _i = 0, _ref = packets.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; window_end = 0 <= _ref ? ++_i : --_i) {
        window_bytes += packets[window_end].ethernet.byteLength;
        while (window_size < packets[window_end].timestamp - packets[window_begin].timestamp) {
          window_bytes -= packets[window_begin].ethernet.byteLength;
          window_begin += 1;
        }
        if (window_begin === 0) {
          continue;
        }
        current_bandwidth = window_bytes * 8 / window_size / 1000;
        if (current_bandwidth > max_bandwidth) {
          max_bandwidth = current_bandwidth;
        }
      }
      return Math.ceil(max_bandwidth);
    };

    return Capture;

  })();

  Stream = (function() {
    function Stream(capture, ab, ba, connection) {
      var add, inprogress, startnew,
        _this = this;

      this.capture = capture;
      this.src = {
        ip: connection.a.ip,
        port: connection.a.port,
        address: connection.a.ip + ':' + connection.a.port
      };
      this.dst = {
        ip: connection.b.ip,
        port: connection.b.port,
        address: connection.b.ip + ':' + connection.b.port
      };
      this.transactions = [];
      this.domain = void 0;
      inprogress = void 0;
      add = function() {
        var _ref;

        if ((_ref = _this.domain) == null) {
          _this.domain = inprogress.request.headers.host;
        }
        _this.transactions.push(inprogress);
        return inprogress.id = _this.capture.transactions.push(inprogress) - 1;
      };
      startnew = function() {
        return inprogress = new Transaction(_this, ab, ba, connection, add, startnew);
      };
      startnew();
    }

    return Stream;

  })();

  Transaction = (function() {
    var parse_headers;

    parse_headers = function(info) {
      var headers;

      headers = info.headers;
      info.headers = {};
      while (headers.length !== 0) {
        info.headers[headers.shift().toLowerCase()] = headers.shift();
      }
      return info;
    };

    Transaction.prototype.register_packet = function(connection, buffer, packet) {
      var _ref, _ref1;

      packet.transaction = this;
      this.packets.push(packet);
      if (packet.ipv4.src.toString() === connection.a.ip && packet.tcp.srcport === connection.a.port) {
        this.packets_out.push(packet);
        if (packet.tcp.payload.size > 0) {
          if ((_ref = this.request_first) == null) {
            this.request_first = packet;
          }
          return this.request_last = packet;
        }
      } else {
        this.packets_in.push(packet);
        if (packet.tcp.payload.size > 0) {
          if ((_ref1 = this.response_first) == null) {
            this.response_first = packet;
          }
          return this.response_last = packet;
        }
      }
    };

    function Transaction(stream, ab, ba, connection, onbegin, onend) {
      var req_parser, res_parser,
        _this = this;

      this.stream = stream;
      this.capture = this.stream.capture;
      req_parser = new HTTPParser(HTTPParser.REQUEST);
      res_parser = new HTTPParser(HTTPParser.RESPONSE);
      req_parser.onHeadersComplete = function(info) {
        if (_this.request != null) {
          return;
        }
        _this.request = parse_headers(info);
        return onbegin();
      };
      res_parser.onHeadersComplete = function(info) {
        _this.response = parse_headers(info);
        if (!('transfer-encoding' in _this.response.headers) && !('content-length' in _this.response.headers)) {
          return res_parser.onMessageComplete();
        }
      };
      this.packets = [];
      this.packets_in = [];
      this.packets_out = [];
      connection.on('data', this.register_packet.bind(this, connection));
      ab.on('data', function(dv) {
        return req_parser.execute(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength), 0, dv.byteLength);
      });
      ba.on('data', function(dv) {
        return res_parser.execute(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength), 0, dv.byteLength);
      });
      ab.on('end', function() {
        return req_parser.finish();
      });
      ba.on('end', function() {
        return res_parser.finish();
      });
      res_parser.onMessageComplete = function() {
        var _i, _j, _len, _len1, _ref, _ref1;

        _ref = [connection, ab, ba];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          stream = _ref[_i];
          stream.removeAllListeners('data');
        }
        _ref1 = [connection, ab, ba];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          stream = _ref1[_j];
          stream.removeAllListeners('end');
        }
        connection.on('data', function(buffer, packet) {
          var event, _k, _len2, _ref2;

          if (packet.tcp.payload.size === 0) {
            return _this.register_packet(connection, buffer, packet);
          } else {
            _ref2 = ['data', 'end'];
            for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
              event = _ref2[_k];
              connection.removeAllListeners(event);
            }
            onend();
            return connection.emit('data', buffer, packet);
          }
        });
        return connection.on('end', function() {
          var event, _k, _len2, _ref2;

          _ref2 = ['data', 'end'];
          for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
            event = _ref2[_k];
            connection.removeAllListeners(event);
          }
          return onend();
        });
      };
    }

    Transaction.prototype.begin = function(bandwidth) {
      return packet_begin_time(this.packets[0], bandwidth);
    };

    Transaction.prototype.end = function() {
      return packets[packets.length - 1].timestamp;
    };

    Transaction.prototype.request_begin = function(bandwidth) {
      return packet_begin_time(this.request_first, bandwidth);
    };

    Transaction.prototype.request_end = function() {
      return this.request_last.timestamp;
    };

    Transaction.prototype.request_duration = function(bandwidth) {
      return this.request_end() - this.request_begin(bandwidth);
    };

    Transaction.prototype.response_begin = function(bandwidth) {
      return packet_begin_time(this.response_first, bandwidth);
    };

    Transaction.prototype.response_end = function() {
      return this.response_last.timestamp;
    };

    Transaction.prototype.response_duration = function(bandwidth) {
      return this.response_end() - this.response_begin(bandwidth);
    };

    return Transaction;

  })();

  $(function() {
    var bandwidth, barcode, capture, client, color_by, draw, duration, e, filtered_capture, hide_timeout, load, notsupported, options, options_panel, options_toggle, palette, prepare, server, stacked, svg, timeout, width;

    timeout = function(time, f) {
      return setTimeout(f, time);
    };
    options = function(dropdown, options) {
      return dropdown.html(options.map(function(text) {
        return "<option>" + text + "</option>";
      }).join(''));
    };
    notsupported = function() {
      return alert('Sorry, this browser is not yet supported. Please come back with Chrome or Chromium.');
    };
    try {
      if (typeof Packet.views.PcapFile !== 'function') {
        notsupported();
      }
    } catch (_error) {
      e = _error;
      notsupported();
    }
    capture = void 0;
    svg = $('#barcode-container>svg');
    barcode = window.barcode = new Barcode(svg[0]);
    stacked = window.stacked = new StackedArea(svg[0]);
    client = void 0;
    server = void 0;
    bandwidth = void 0;
    color_by = 'stream';
    svg.attr('class', 'dark');
    width = $(document).width();
    svg.attr('width', width + 'px');
    filtered_capture = void 0;
    duration = void 0;
    palette = void 0;
    draw = function() {
      $('#intro').hide();
      $('#barcode-container').show();
      barcode.draw(filtered_capture, palette, bandwidth);
      return stacked.draw(filtered_capture, palette, bandwidth, 125);
    };
    prepare = function() {
      var kbit;

      window.filtered_capture = filtered_capture = capture.filter(client, server);
      kbit = filtered_capture.bandwidth();
      $('#bandwidth-input').val(Math.round(kbit));
      bandwidth = kbit * 1000 / 8;
      duration = filtered_capture.duration(bandwidth);
      return palette = new Palette(filtered_capture, color_by);
    };
    load = function(pcap) {
      capture = new Capture(pcap);
      prepare();
      draw();
      options($('#client-dropdown'), ['any client'].concat(capture.clients()));
      options($('#server-dropdown'), ['any server'].concat(capture.servers()));
      $('#time-input').val(Math.round(duration * 10) / 10);
      $('#width-input').val(Math.round(width));
      $('#width-s-input').val(Math.round(width / duration));
      $('#options-toggle').prop('disabled', false);
      $('#download-button').prop('disabled', false);
      $('#loading').hide();
      return $('#hints').hide();
    };
    $('#load-example').click(function() {
      $('#loading').show();
      $(this).html('Please wait...').prop('disabled', true);
      timeout(0, function() {
        return window.load_example(load);
      });
      return false;
    });
    $("#file-chooser").filestyle({
      buttonText: 'Choose PCAP file',
      icon: true,
      classIcon: 'icon-folder-open',
      textField: false
    }).change(function() {
      var file, reader;

      $('#loading').show();
      file = this.files[0];
      reader = new FileReader();
      reader.readAsArrayBuffer(file);
      return reader.onload = function() {
        return load(new DataView(reader.result));
      };
    });
    options_panel = $('#options');
    options_toggle = $('#options-toggle');
    options_toggle.click(function() {
      options_toggle.parent().toggleClass('open');
      options_panel.toggle();
      return false;
    });
    $('body').click(function(event) {
      if (options_panel.has(event.target).length === 0) {
        options_panel.hide();
        return options_toggle.parent().removeClass('open');
      }
    });
    $('#download-button').click(function() {
      barcode.download('svg');
      return false;
    });
    $('#colorby-dropdown').change(function() {
      color_by = this.selectedOptions[0].innerHTML;
      palette = new Palette(filtered_capture, color_by);
      return draw();
    });
    $('#colortheme-dropdown').change(function() {
      return svg.attr('class', this.selectedOptions[0].innerHTML);
    });
    $('#bandwidth-input').change(function() {
      bandwidth = Number(this.value) * 1000 / 8;
      return draw();
    });
    $('#width-input').change(function() {
      $('#width-s-input').val(Math.round(this.value / duration));
      return svg.attr('width', this.value + 'px');
    });
    $('#width-s-input').change(function() {
      return $('#width-input').val(Math.round(this.value * duration)).change();
    });
    $('#client-dropdown')[0].onchange = $('#server-dropdown')[0].onchange = function() {
      client = $('#client-dropdown')[0].selectedOptions[0].innerHTML;
      server = $('#server-dropdown')[0].selectedOptions[0].innerHTML;
      if (client === 'any client') {
        client = void 0;
      }
      if (server === 'any server') {
        server = void 0;
      }
      prepare();
      return draw();
    };
    hide_timeout = void 0;
    barcode.onmouseover = function(stream, transaction, packet) {
      if (stream) {
        $('#tcp-info').text("TCP #" + stream.id);
      }
      if (transaction) {
        $('#http-info').text("HTTP #" + transaction.id);
      }
      if (packet) {
        $('#packet-info').text("packet #" + (packet.id + 1));
      }
      if (stream || transaction || packet) {
        clearTimeout(hide_timeout);
      }
      if (!stream || !transaction || !packet) {
        return hide_timeout = timeout(200, function() {
          if (!stream) {
            $('#tcp-info').text('');
          }
          if (!transaction) {
            $('#http-info').text('');
          }
          if (!packet) {
            return $('#packet-info').text('');
          }
        });
      }
    };
    return barcode.onmousemove = function(time) {
      return $('#time-info').text(Math.max(0, time).toFixed(2) + 's');
    };
  });

  load_hints = function() {
    var hint_buttons, template;

    template = '<a class="next-hint" href="#" onclick="next_popover(#id#); return false;">Next</a>';
    hint_buttons = $('#hints>i');
    hint_buttons.each(function(id) {
      var icon;

      icon = $(this);
      if (id === hint_buttons.length - 1) {
        template = template.replace('Next', 'Close');
      }
      icon.popover({
        html: true,
        content: icon.attr('data-content') + template.replace('#id#', id),
        placement: icon.attr('data-placement') || 'right',
        animation: false
      });
      if (icon.css('position') === 'fixed') {
        return icon.click(function() {
          return icon.siblings('.popover').css({
            'position': 'fixed',
            'z-index': 10000
          });
        });
      }
    });
    hint_buttons.click(function() {
      return $(this).siblings('i').popover('hide');
    });
    window.next_popover = function(id) {
      hint_buttons.popover('hide');
      return setTimeout((function() {
        return $(hint_buttons[id + 1]).click();
      }), 50);
    };
    $('body').click(function(event) {
      if ($('#hints').has(event.target).length === 0 && !$(event.target).parents().hasClass('popover')) {
        return $('#hints>*').popover('hide');
      }
    });
    $('#hints').show();
    return $('#hints>*').first().popover('show');
  };

  window.load_example = function(load_pcap) {
    var xhr;

    xhr = new XMLHttpRequest();
    xhr.open('GET', 'example/example.pcap', true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
      load_pcap(this.response);
      return load_hints();
    };
    return xhr.send();
  };

  window.Palette = Palette = (function() {
    var monochrome_color, palette_size;

    palette_size = 14;

    monochrome_color = 0;

    Palette.prototype.color = function(transaction) {
      if (this.method === 'monochrome') {
        return monochrome_color;
      } else {
        return this.transaction_colors[transaction.id] % palette_size;
      }
    };

    function Palette(capture, method) {
      var color, content_colors, content_type, domain_colors, next_color, stream, transaction, _i, _j, _k, _l, _len, _len1, _len2, _len3, _name, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;

      this.method = method;
      this.transaction_colors = {};
      next_color = 0;
      switch (this.method) {
        case 'stream':
          _ref = capture.transactions;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            transaction = _ref[_i];
            this.transaction_colors[transaction.id] = next_color++;
          }
          break;
        case 'domain':
          domain_colors = {};
          _ref1 = capture.streams;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            stream = _ref1[_j];
            if ((_ref2 = domain_colors[_name = stream.domain]) == null) {
              domain_colors[_name] = next_color++;
            }
            color = domain_colors[stream.domain];
            _ref3 = stream.transactions;
            for (_k = 0, _len2 = _ref3.length; _k < _len2; _k++) {
              transaction = _ref3[_k];
              this.transaction_colors[transaction.id] = color;
            }
          }
          break;
        case 'content-type':
          content_colors = {};
          _ref4 = capture.transactions;
          for (_l = 0, _len3 = _ref4.length; _l < _len3; _l++) {
            transaction = _ref4[_l];
            content_type = (_ref5 = transaction.response) != null ? _ref5.headers['content-type'] : void 0;
            if (content_type != null ? content_type.match(/javascript/) : void 0) {
              content_type = 'javascript';
            }
            if (content_type != null ? content_type.match(/image/) : void 0) {
              content_type = 'image';
            }
            if (content_type != null ? content_type.match(/html/) : void 0) {
              content_type = 'html';
            }
            if ((_ref6 = content_colors[content_type]) == null) {
              content_colors[content_type] = next_color++;
            }
            color = content_colors[content_type];
            this.transaction_colors[transaction.id] = color;
          }
      }
    }

    return Palette;

  })();

  window.StackedArea = StackedArea = (function() {
    function StackedArea(svg) {
      this.svg = d3.select(svg);
    }

    StackedArea.prototype.draw = function(capture, palette, bandwidth, intervals) {
      var begin, data, duration, end, interval, rect, scale_x, scale_y, stream, transactions;

      begin = capture.begin(bandwidth);
      end = capture.end();
      duration = end - begin;
      interval = duration / intervals;
      transactions = _.sortBy(capture.transactions, function(transaction) {
        return palette.color(transaction);
      });
      data = d3.layout.stack()(transactions.map(function(transaction) {
        var i, interval_begin, interval_data, interval_end, packet, packet_begin, packet_duration, packet_end, packet_interval_duration, _i, _j, _len, _ref, _results;

        _results = [];
        for (i = _i = 0; 0 <= intervals ? _i <= intervals : _i >= intervals; i = 0 <= intervals ? ++_i : --_i) {
          interval_begin = i * interval;
          interval_end = interval_begin + interval;
          interval_data = 0;
          _ref = transaction.packets_in;
          for (_j = 0, _len = _ref.length; _j < _len; _j++) {
            packet = _ref[_j];
            packet_duration = packet.ethernet.byteLength / bandwidth;
            packet_end = packet.timestamp - begin;
            packet_begin = packet_end - packet_duration;
            if (packet_end < interval_begin || packet_begin > interval_end) {
              continue;
            }
            packet_interval_duration = Math.min(packet_end, interval_end) - Math.max(packet_begin, interval_begin);
            interval_data += packet.ethernet.byteLength * packet_interval_duration / packet_duration;
          }
          _results.push({
            x: i,
            y: interval_data
          });
        }
        return _results;
      }));
      scale_x = d3.scale.linear().range([0, 100]).domain([0, intervals]);
      scale_y = d3.scale.linear().range([0, 90]).domain([
        0, d3.max(data[data.length - 1], function(d) {
          return d.y0 + d.y;
        })
      ]);
      stream = this.svg.select('#stackedarea').selectAll("g").data(data);
      stream.enter().append("svg:g");
      stream.attr("class", function(d, i) {
        return "color-" + palette.color(transactions[i]);
      });
      stream.exit().remove();
      rect = stream.selectAll("rect").data(Object);
      rect.enter().append("svg:rect").attr("x", function(d) {
        return scale_x(d.x) + '%';
      }).attr("width", 100 / intervals + '%');
      return rect.attr("y", function(d) {
        return 100 - scale_y(d.y0 + d.y) + '%';
      }).attr("height", function(d) {
        return scale_y(d.y) + '%';
      });
    };

    return StackedArea;

  })();

}).call(this);
