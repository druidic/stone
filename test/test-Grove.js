describe('Grove', function() {
  var receiveOutput
  var handleDataChange

  function lastOutput() {
    return receiveOutput.calls.mostRecent().args[0]
  }

  beforeEach(function() {
    receiveOutput = jasmine.createSpy('receiveOutput')
    handleDataChange = jasmine.createSpy('handleDataChange')
    jasmine.clock().install()
  })

  afterEach(function() {
    jasmine.clock().uninstall()
  })

  it('renders an error when there are no records', function() {
    var g = Grove({}, receiveOutput)
    expect(receiveOutput).toHaveBeenCalledWith(["Can't start up because system/startup.js is empty."])
  })

  it('does not react to keypresses when booting is not successful', function() {
    var g = Grove({}, receiveOutput)
    g.handleKeyDown({keyCode: 32})
    expect(receiveOutput.calls.mostRecent().args[0])
      .toEqual(["Can't start up because system/startup.js is empty."])
  })

  it('renders an error when the startup record has a syntax error', function() {
    var records = {
      'system/startup.js':
        'function ()'
    }
    var g = Grove(records, receiveOutput)
    expect(lastOutput()).toContain('An error occurred while starting up:')
    expect(lastOutput()).toContain('SyntaxError: Unexpected token (')
  })

  it('renders the output of main() when the startup record is valid', function() {
    var records = {
      'system/startup.js':
        'function main() { return "hello" }'
    }
    var g = Grove(records, receiveOutput)
    expect(lastOutput()[0]).toContain('hello')
  })

  it('does not allow the main() function to access Grove-defined functions', function() {
    var records = {
      'system/startup.js':
        'function main() { return Grove().toString() }'
    }
    var g = Grove(records, receiveOutput)
    expect(lastOutput()).toContain('An error occurred while starting up:')
    expect(lastOutput()).toContain('TypeError: Grove is not a function')
  })

  it('does not allow the main() function to access global functions', function() {
    var records = {
      'system/startup.js':
        'function main() { return setTimeout().toString() }'
    }
    var g = Grove(records, receiveOutput)
    expect(lastOutput()).toContain('An error occurred while starting up:')
    expect(lastOutput()).toContain('TypeError: setTimeout is not a function')
  })

  it('escapes HTML in data output from main()', function() {
    var records = {
      'system/startup.js':
        'function main() { return "<script>hacked&" }'
    }
    var g = Grove(records, receiveOutput)
    expect(lastOutput()[0]).toContain('&lt;script&gt;hacked&amp;')
  })

  it('allows main() to format text with LineBuffer', function() {
    var records = {
      'system/startup.js':
        'function main() { '
        + 'return LineBuffer().paste("hello", 0, {b: 1})'
        + '}'
    }
    var g = Grove(records, receiveOutput)
    expect(lastOutput()[0]).toContain('<span class="bold">hello</span>')
  })

  it('allows main() to return output as an array', function() {
    var records = {
      'system/startup.js':
        'function main() { return ["line 1", "line 2"] }'
    }
    var g = Grove(records, receiveOutput)
    expect(lastOutput()[0]).toContain('line 1')
    expect(lastOutput()[1]).toContain('line 2')
  })

  it('allows main() to return output as an object with a "screen" property', function() {
    var records = {
      'system/startup.js':
        'function main() { return {screen: "foo"} }'
    }
    var g = Grove(records, receiveOutput)
    expect(lastOutput()[0]).toContain('foo')
  })

  it('outputs the recordsystem state as json', function() {
    var records = { foo: 'bar' }
    var g = Grove(records, receiveOutput)
    expect(g.getDataAsJSON()).toEqual('{"foo":"bar"}')
  })

  it('passes the key code to main() when a key is pressed', function() {
    var records = {
      'system/startup.js':
        'function main(evt) { return evt.type + ": " + evt.key }'
    }
    var g = Grove(records, receiveOutput)

    expect(lastOutput()[0]).toContain('startup: undefined')
    g.handleKeyDown({keyCode: 32})

    expect(lastOutput()[0]).toContain('keyDown: 32')

    g.handleKeyDown({keyCode: 65})

    expect(lastOutput()[0]).toContain('keyDown: 65')
  })

  it('does not register duplicate key presses with no intervening key release', function() {
    // this is important because the browser will send repeated
    // keydown events when a key is held.
    var records = {
      'system/startup.js':
        'var count = 0; function main(evt) { return "" + (count++) }'
    }
    var g = Grove(records, receiveOutput)

    g.handleKeyDown({keyCode: 32})
    g.handleKeyDown({keyCode: 32})

    expect(lastOutput()[0]).toContain('1')
  })

  it('does register a key press after the key is released', function() {
    // this is important because the browser will send repeated
    // keydown events when a key is held.
    var records = {
      'system/startup.js':
        'var count = 0; function main(evt) { return "" + (count++) }'
    }
    var g = Grove(records, receiveOutput)

    g.handleKeyDown({keyCode: 32})
    g.handleKeyUp({keyCode: 32})
    g.handleKeyDown({keyCode: 32})

    expect(lastOutput()[0]).toContain('3')
  })

  it('passes the key code to main() when a key is released', function() {
    var records = {
      'system/startup.js':
        'function main(evt) { return evt.type + ": " + evt.key }'
    }
    var g = Grove(records, receiveOutput)

    expect(lastOutput()[0]).toContain('startup: undefined')
    g.handleKeyUp({keyCode: 32})

    expect(lastOutput()[0]).toContain('keyUp: 32')
  })

  it('allows main() to read and write data records', function() {
    var records = {
      'system/startup.js':
        'function main(event, data) { '
        + 'var count = +data.read("count") || 0;'
        + 'return {'
        + '  screen: count,'
        + '  records: {"count": "" + (count+1)}'
        + '} }'
    }

    var g = Grove(records, receiveOutput)
    expect(lastOutput()[0]).toContain('0')
    g.handleKeyDown({keyCode: 65})
    expect(lastOutput()[0]).toContain('1')

    expect(JSON.parse(g.getDataAsJSON()).count).toBe('2')
  })

  it('notifies listeners of data record changes', function() {
    var records = {
      'system/startup.js':
        'function main(event, data) { '
        + 'var count = +data.read("count") || 0;'
        + 'return {'
        + '  screen: count,'
        + '  records: {"count": "" + (count+1)}'
        + '} }'
    }

    var g = Grove(records, receiveOutput, handleDataChange)
    expect(handleDataChange).toHaveBeenCalledWith('count', '1')
    g.handleKeyDown({keyCode: 65})
    expect(handleDataChange).toHaveBeenCalledWith('count', '2')
  })

  it('calls main() for every frame of animation', function() {
    var records = {
      'system/startup.js':
        'var calls = 0;'
        + 'function main(event) { '
        + 'return "" + (calls++)'
        + '}'
    }

    var g = Grove(records, receiveOutput)
    g.handleClock()
    expect(lastOutput()[0]).toContain(1)
    g.handleClock()
    expect(lastOutput()[0]).toContain(2)
  })
})
