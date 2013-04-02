// Generated by CoffeeScript 1.6.1
(function() {
  var Capture, HTTPParser, Packet, Stream, Transaction, packet_begin;

  Packet = window.Packet;

  HTTPParser = window.HTTPParser;

  packet_begin = function(packet, bandwidth) {
    return packet.timestamp - packet.size / bandwidth;
  };

  window.Capture = Capture = (function() {

    function Capture(pcap) {
      var tcp_tracker,
        _this = this;
      this.pcap = new Packet.views.PcapFile(pcap);
      this.streams = [];
      tcp_tracker = Packet.stream.tcp();
      tcp_tracker.on('connection', function(ab, ba, connection) {
        return _this.streams.push(new Stream(_this, ab, ba, connection));
      });
      this.pcap.packets.forEach(function(packet, id) {
        packet.id = id;
        packet.timestamp = packet.ts_sec + packet.ts_usec / 1000000;
        return tcp_tracker.write(packet);
      });
    }

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

    Capture.prototype.transactions = function() {
      var stream;
      return _.flatten((function() {
        var _i, _len, _ref, _results;
        _ref = this.streams;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          stream = _ref[_i];
          _results.push(stream.transactions);
        }
        return _results;
      }).call(this));
    };

    Capture.prototype.filter = function(client, server) {
      var filtered, stream, _i, _len, _ref;
      filtered = Object.create(Capture.prototype);
      filtered.pcap = this.pcap;
      filtered.streams = [];
      _ref = this.streams;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        stream = _ref[_i];
        if ((!client || stream.src.ip === client) && (!server || stream.dst.address === server)) {
          filtered.streams.push(stream);
        }
      }
      return filtered;
    };

    Capture.prototype.packets = function() {
      var packets, stream, transaction;
      packets = _.flatten((function() {
        var _i, _len, _ref, _results;
        _ref = this.streams;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          stream = _ref[_i];
          _results.push((function() {
            var _j, _len1, _ref1, _results1;
            _ref1 = stream.transactions;
            _results1 = [];
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              transaction = _ref1[_j];
              _results1.push(transaction.packets);
            }
            return _results1;
          })());
        }
        return _results;
      }).call(this));
      return _.sortBy(packets, function(packet) {
        return packet.timestamp;
      });
    };

    Capture.prototype.packets_in = function() {
      var packets, stream, transaction;
      packets = _.flatten((function() {
        var _i, _len, _ref, _results;
        _ref = this.streams;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          stream = _ref[_i];
          _results.push((function() {
            var _j, _len1, _ref1, _results1;
            _ref1 = stream.transactions;
            _results1 = [];
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              transaction = _ref1[_j];
              _results1.push(transaction.packets_in);
            }
            return _results1;
          })());
        }
        return _results;
      }).call(this));
      return _.sortBy(packets, function(packet) {
        return packet.timestamp;
      });
    };

    Capture.prototype.packets_out = function() {
      var packets, stream, transaction;
      packets = _.flatten((function() {
        var _i, _len, _ref, _results;
        _ref = this.streams;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          stream = _ref[_i];
          _results.push((function() {
            var _j, _len1, _ref1, _results1;
            _ref1 = stream.transactions;
            _results1 = [];
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              transaction = _ref1[_j];
              _results1.push(transaction.packets_out);
            }
            return _results1;
          })());
        }
        return _results;
      }).call(this));
      return _.sortBy(packets, function(packet) {
        return packet.timestamp;
      });
    };

    Capture.prototype.first_packet = function() {
      return this.packets()[0];
    };

    Capture.prototype.last_packet = function() {
      var packets;
      packets = this.packets();
      return packets[packets.length - 1];
    };

    Capture.prototype.begin = function(bandwidth) {
      return packet_begin(this.first_packet(), bandwidth);
    };

    Capture.prototype.end = function() {
      return this.last_packet().timestamp;
    };

    Capture.prototype.duration = function(bandwidth) {
      return this.end() - this.begin(bandwidth);
    };

    Capture.prototype.bandwidth = function() {
      var current_bandwidth, max_bandwidth, packets, window_begin, window_bytes, window_end, window_size, _i, _ref;
      packets = this.packets_in();
      window_size = 0.4;
      window_begin = 0;
      window_bytes = 0;
      max_bandwidth = 0;
      for (window_end = _i = 0, _ref = packets.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; window_end = 0 <= _ref ? ++_i : --_i) {
        window_bytes += packets[window_end].size;
        while (window_size < packets[window_end].timestamp - packets[window_begin].timestamp) {
          window_bytes -= packets[window_begin].size;
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
      var inprogress, parse_transaction,
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
      parse_transaction = function() {
        var _ref;
        if ((_ref = _this.domain) == null) {
          _this.domain = inprogress.request.headers.host;
        }
        _this.transactions.push(inprogress);
        return inprogress = new Transaction(_this, ab, ba, connection, parse_transaction);
      };
      inprogress = new Transaction(this, ab, ba, connection, parse_transaction);
    }

    return Stream;

  })();

  Transaction = (function() {
    var next_id, parse_headers;

    next_id = 0;

    parse_headers = function(info) {
      var headers;
      headers = info.headers;
      info.headers = {};
      while (headers.length !== 0) {
        info.headers[headers.shift().toLowerCase()] = headers.shift();
      }
      return info;
    };

    function Transaction(stream, ab, ba, connection, ready) {
      var req_parser, res_parser,
        _this = this;
      this.stream = stream;
      this.id = next_id;
      next_id += 1;
      req_parser = new HTTPParser(HTTPParser.REQUEST);
      res_parser = new HTTPParser(HTTPParser.RESPONSE);
      req_parser.onHeadersComplete = function(info) {
        if (_this.request != null) {
          return;
        }
        _this.request = parse_headers(info);
        return _this.request_ack = _this.packets_in[_this.packets_in.length - 1];
      };
      res_parser.onHeadersComplete = function(info) {
        return _this.response = parse_headers(info);
      };
      this.packets = [];
      this.packets_in = [];
      this.packets_out = [];
      connection.on('data', function(buffer, packet) {
        var _ref;
        packet.transaction = _this;
        _this.packets.push(packet);
        if (packet.ipv4.src.toString() === connection.a.ip && packet.tcp.srcport === connection.a.port) {
          _this.packets_out.push(packet);
          if (packet.tcp.payload.size > 0) {
            return (_ref = _this.request_first_data) != null ? _ref : _this.request_first_data = packet;
          }
        } else {
          return _this.packets_in.push(packet);
        }
      });
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
        return ready();
      };
    }

    Transaction.prototype.request_first = function() {
      return this.request_first_data || this.packets_out[0];
    };

    Transaction.prototype.request_last = function() {
      return this.request_ack;
    };

    Transaction.prototype.request_begin = function(bandwidth) {
      return packet_begin(this.request_first(), bandwidth);
    };

    Transaction.prototype.request_end = function() {
      return this.request_last().timestamp;
    };

    Transaction.prototype.request_duration = function(bandwidth) {
      return this.request_end() - this.request_begin(bandwidth);
    };

    Transaction.prototype.response_first = function() {
      return this.packets_in[this.packets_in.indexOf(this.request_ack) + 1];
    };

    Transaction.prototype.response_last = function() {
      return this.packets_in[this.packets_in.length - 1];
    };

    Transaction.prototype.response_begin = function(bandwidth) {
      return packet_begin(this.response_first(), bandwidth);
    };

    Transaction.prototype.response_end = function() {
      return this.response_last().timestamp;
    };

    Transaction.prototype.response_duration = function(bandwidth) {
      return this.response_end() - this.response_begin(bandwidth);
    };

    return Transaction;

  })();

}).call(this);
