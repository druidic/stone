var Immutable = require('../src/immutable')

describe('Grove', function() {
  var lastOutput
  function receiveOutput (output) {
    lastOutput = output
  }

  beforeEach(function() {
    lastOutput = []
  })

  it('is initially off', function() {
    var g = Grove({}, receiveOutput)
    expect(g.isOn()).toBe(false)
  })

  it('turns on and off', function() {
    var g = Grove({}, receiveOutput)
    g.turnOn()
    expect(g.isOn()).toBe(true)
    g.turnOff()
    expect(g.isOn()).toBe(false)
  })

  it('initially renders nothing', function() {
    Grove({}, receiveOutput)
    expect(lastOutput).toEqual([])
  })

  it('renders an error when turned on with no files', function() {
    var g = Grove({}, receiveOutput)
    g.turnOn()
    expect(lastOutput).toContain('Tried to read from system/startup.js, but there is no such entry')
  })

  it('does not react to keypresses when booting is not successful', function() {
    var g = Grove({}, receiveOutput)
    g.turnOn()
    g.handleKeyDown({keyCode: 32})
    expect(lastOutput).toContain('Tried to read from system/startup.js, but there is no such entry')
  })

  it('renders an error when the startup file has a syntax error', function() {
    var files = {
      'system/startup.js':
        'function ()'
    }
    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput).toContain('An error occurred while starting up:')
    expect(lastOutput).toContain('SyntaxError: Unexpected token (')
  })

  it('can be rebooted after an error', function() {
    var files = {
      'system/startup.js':
        'function ()'
    }
    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput).toContain('An error occurred while starting up:')

    g.turnOff()
    g.editEntry('system/startup.js', 'function main() { return "it works" }')
    g.turnOn()

    expect(lastOutput[0]).toContain('it works')
  })

  it('renders the output of main() when the startup file is valid', function() {
    var files = {
      'system/startup.js':
        'function main() { return "hello" }'
    }
    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput[0]).toContain(['hello'])
  })

  it('does not allow the main() function to access Grove-defined functions', function() {
    var files = {
      'system/startup.js':
        'function main() { return Grove().toString() }'
    }
    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput).toContain('An error occurred while starting up:')
    expect(lastOutput).toContain('TypeError: Grove is not a function')
  })

  it('does not allow the main() function to access global functions', function() {
    var files = {
      'system/startup.js':
        'function main() { return setTimeout().toString() }'
    }
    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput).toContain('An error occurred while starting up:')
    expect(lastOutput).toContain('TypeError: setTimeout is not a function')
  })

  it('escapes HTML in data output from main()', function() {
    var files = {
      'system/startup.js':
        'function main() { return "<script>hacked&" }'
    }
    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput[0]).toContain('&lt;script&gt;hacked&amp;')
  })

  it('allows main() to format text with LineBuffer', function() {
    var files = {
      'system/startup.js':
        'function main() { '
        + 'return LineBuffer().paste("hello", 0, {b: 1})'
        + '}'
    }
    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput[0]).toContain('<span class="bold">hello</span>')
  })

  it('allows main() to return output as an array', function() {
    var files = {
      'system/startup.js':
        'function main() { return ["line 1", "line 2"] }'
    }
    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput[0]).toContain('line 1')
    expect(lastOutput[1]).toContain('line 2')
  })

  it('allows main() to return output as an object with a "screen" property', function() {
    var files = {
      'system/startup.js':
        'function main() { return {screen: "foo"} }'
    }
    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput[0]).toContain('foo')
  })

  it('has a name, read from system/name', function() {
    var files = {
      'system/name': 'custom name'
    }
    var g = Grove(files, receiveOutput)
    expect(g.getName()).toBe('custom name')
  })

  it('uses "grove" as the default name', function() {
    var files = {
    }
    var g = Grove(files, receiveOutput)
    expect(g.getName()).toBe('grove')
  })

  it('outputs the filesystem state as json', function() {
    var files = { foo: 'bar' }
    var g = Grove(files, receiveOutput)
    expect(g.getDataAsJSON()).toEqual('{"foo":"bar"}')
  })

  it('passes the key code to main() when a key is pressed', function() {
    var files = {
      'system/startup.js':
        'function main(evt) { return evt.type + ": " + evt.key }'
    }
    var g = Grove(files, receiveOutput)

    g.turnOn()
    expect(lastOutput[0]).toContain('startup: undefined')
    g.handleKeyDown({keyCode: 32})

    expect(lastOutput[0]).toContain('keyDown: 32')
  })

  it('passes the key code to main() when a key is released', function() {
    var files = {
      'system/startup.js':
        'function main(evt) { return evt.type + ": " + evt.key }'
    }
    var g = Grove(files, receiveOutput)

    g.turnOn()
    expect(lastOutput[0]).toContain('startup: undefined')
    g.handleKeyUp({keyCode: 32})

    expect(lastOutput[0]).toContain('keyUp: 32')
  })

  it('does not react to keyboard events when turned off', function() {
    var files = {
      'system/startup.js':
        'function main() { return "oops" }'
    }
    var g = Grove(files, receiveOutput)
    g.handleKeyDown({keyCode: 32})
    expect(lastOutput).toEqual([])

    g.handleKeyUp({keyCode: 32})
    expect(lastOutput).toEqual([])
  })

  it('allows main() to read and write data entries', function() {
    var files = {
      'system/startup.js':
        'function main(event, data) { '
        + 'var count = +data.read("count") || 0;'
        + 'return {'
        + '  screen: count,'
        + '  data:   data.write("count", "" + (count+1))'
        + '} }'
    }

    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput[0]).toContain('0')
    g.handleKeyDown({keyCode: 65})
    expect(lastOutput[0]).toContain('1')

    expect(JSON.parse(g.getDataAsJSON()).count).toBe('2')
  })
})
