var fs = require("fs")
  , url = require("url")
  , join = require("path").join
  , EventEmitter = require("events").EventEmitter

  , authom = module.exports = new EventEmitter

authom.servers = {}
authom.route = /^\/auth\/([^\/]+)\/?$/

authom.createServer = function(options, listener) {
  var service = options.service
    , name = options.name || service
    , path = join(__dirname, "services", service)
    , Service
    , server

  try { Service = require(path) }
  catch (err) { throw "No such service: " + path }

  server = authom.servers[name] = new Service(options)

  server.on("auth", function(req, res, user) {
    authom.emit("auth", req, res, {service: name, user: user})
  })

  server.on("error", function(req, res, error) {
    authom.emit("error", req, res, {service: name, error: error})
  })

  if (listener) server.on("request", listener)

  return server  
}

authom.listener = function(req, res) {
  var path = url.parse(req.url).pathname
    , match = path.match(authom.route)
    , service = match && authom.servers[match[1]]

  if (service) {
    service.emit("request", req, res)
    return true
  }
}

authom.listen = function(server) {
  var listeners = server.listeners("request")

  server.removeAllListeners("request")

  server.on("request", function(req, res) {
    if (authom.listener(req, res)) return

    listeners.forEach(function(listener) {
      listener.call(server, req, res)
    })
  })
}