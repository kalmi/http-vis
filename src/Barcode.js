// Generated by CoffeeScript 1.6.1
(function() {
  var Barcode, truncate;

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
        var event, packet, stream, transaction;
        event = d3.event;
        if (event.target.parentNode.classList.toString() === 'packets') {
          packet = capture.capture.packets[event.target.getAttribute('packet-id')];
          transaction = packet.transaction;
          stream = transaction.stream;
          return _this.onmouseover(stream, transaction, packet);
        } else if (event.target.parentNode.classList.toString() === 'transaction') {
          transaction = capture.capture.transactions[event.target.parentNode.getAttribute('transaction-id')];
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

}).call(this);
