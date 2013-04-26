// Generated by CoffeeScript 1.6.2
(function() {
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
    barcode = new Barcode(svg[0]);
    stacked = new StackedArea(svg[0]);
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
      barcode.draw(filtered_capture, palette, bandwidth);
      return stacked.draw(filtered_capture, palette, bandwidth, 125);
    };
    prepare = function() {
      var kbit;

      filtered_capture = capture.filter(client, server);
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
      return $('#loading').hide();
    };
    $('#load-example').click(function() {
      $('#loading').show();
      timeout(0, function() {
        var xhr;

        xhr = new XMLHttpRequest();
        xhr.open('GET', 'example/example.pcap', true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          return load(this.response);
        };
        return xhr.send();
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

}).call(this);
