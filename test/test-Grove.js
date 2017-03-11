describe('Grove', function() {
  var lastOutput
  function receiveOutput (output) {
    lastOutput = output
  }

  beforeEach(function() {
    lastOutput = []
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

  it('renders the output of main() when the startup file is valid', function() {
    var files = {
      'system/startup.js':
        'function main() { return "hello" }'
    }
    var g = Grove(files, receiveOutput)
    g.turnOn()
    expect(lastOutput).toEqual(['hello'])
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
    expect(lastOutput).toEqual(['&lt;script&gt;hacked&amp;'])
  })
})
