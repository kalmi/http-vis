truncate = (maxlength, str) ->
  if str.length <= maxlength
    str
  else
    str.substr(0, maxlength - 1) + '...'

window.Stripes = class Stripes
  margin = 0.1

  constructor: (svg) ->
    @svg = d3.select(svg)

  download: ->
    xml = @svg.node().parentNode.innerHTML.replace(/^\s*<!--\s*([\s\S]*)-->\s*<svg/, '$1\n<svg')
    document.location.href = 'data:application/octet-stream;base64,' + btoa(xml)
    return false

  draw: (capture, palette, bandwidth) ->
    packets = capture.packets_in()

    # Placement
    duration = (packet) -> packet.size / bandwidth
    capture_begin = capture.begin(bandwidth)

    scale = d3.scale.linear()
      .domain([0, capture.end() - capture_begin])
      .range(['0%', '100%'])

    # Drawing packets
    draw_packets = (stripes, y, height) ->
      stripes.enter().append('rect')
        .attr('class', 'packet')
        .attr('y', y)
        .attr('height', height)
        .attr('packet-id', (packet) -> packet.id)

      stripes
        .attr('x', (packet) -> scale(packet.timestamp - duration(packet) - capture_begin))
        .attr('width', (packet) -> scale(duration(packet)))
        .attr('fill', (packet) -> palette.color(packet.transaction))

      stripes.exit().remove()

    draw_packets @svg.selectAll('rect.packet').data(packets), 0, '100%'

    # Drawing transactions
    transactions = capture.transactions().filter (t) -> (t.request and t.response) or console.error('incomplete transaction:', t)
    streams = capture.streams.filter (stream) -> stream.transactions.length isnt 0
    transaction_y = (transaction) -> 2*margin + (1 + 2*margin) * (streams.indexOf transaction.stream)

    bars = @svg.selectAll('a.transaction').data(transactions)

    as = bars.enter().append('a')
      .attr('class', 'transaction')
      .attr('id', (t, id) -> 'transaction-' + id)
      .attr('xlink:href', (t, id) -> t.request.url)
    as.append('title').text (t,i) ->
      "TCP##{streams.indexOf(t.stream)} (#{t.stream.domain})\n" +
      "HTTP##{i} (#{truncate 20, t.request.url.substr(t.request.url.lastIndexOf('/') + 1)})\n" +
      "begin: #{(t.request_begin(bandwidth) - capture_begin).toFixed(2)}s\n" +
      "sending: #{Math.round t.request_duration(bandwidth) * 1000}ms\n" +
      "waiting: #{Math.round (t.response_begin(bandwidth) - t.request_end()) * 1000}ms\n" +
      "receiving: #{Math.round t.response_duration(bandwidth) * 1000}ms"
    as.append('rect')
      .attr('class', 'stream')
      .attr('height', '1em')
    as.append('rect')
      .attr('class', 'request')
      .attr('height', '1em')
    #as.append('rect')
    #  .attr('class', 'response')
    #  .attr('height', '1em')

    bars.each((t, id) -> draw_packets d3.select(@).selectAll('rect.packet').data(t.packets_in), transaction_y(t) + 0.1 + 'em', '0.8em')
    bars.select('rect.stream')
      .attr('x',     (t, id) -> scale(t.begin(bandwidth) - capture_begin))
      .attr('y',     (t, id) -> transaction_y(t) + 'em')
      .attr('width', (t, id) -> scale(t.response_end() - t.begin(bandwidth)))
    bars.select('rect.request')
      .attr('x',     (t, id) -> scale(t.request_begin(bandwidth) - capture_begin))
      .attr('y',     (t, id) -> transaction_y(t) + 'em')
      .attr('width', (t, id) -> scale(t.response_begin(bandwidth) - t.request_begin(bandwidth)))
    #bars.select('rect.response')
    #  .attr('x',     (t, id) -> scale(t.response_begin(bandwidth) - capture_begin))
    #  .attr('y',     (t, id) -> transaction_y(t) + 'em')
    #  .attr('width', (t, id) -> scale(t.response_duration(bandwidth)))

    bars.exit().remove()

    em = Number(getComputedStyle(bars[0][0], "").fontSize.match(/(\d*(\.\d*)?)px/)[1])
    @svg.attr('height', (2*margin + streams.length * (1 + 2*margin)) * em + 'px')
