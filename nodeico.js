const path        = require('path')
    , http        = require('http')
    , swig        = require('swig')
    , humanize    = require('humanize-number')
    , Router      = require('routes-router')
    , bole        = require('bole')
    , sendPlain   = require('send-data/plain')
    , sendError   = require('send-data/error')
    , st          = require('st')
    , uuid        = require('node-uuid')
    , log         = bole('server')
    , reqLog      = bole('server:request')

    , isDev       = (/^dev/i).test(process.env.NODE_ENV)
    , port        = process.env.PORT || 3000
    , start       = new Date()

    , routes      = [
          require('./lib/routes/index')
        , require('./lib/routes/script')
        , require('./lib/routes/npm-badge')
        , require('./lib/routes/npm-downloads-badge')
        , require('./lib/routes/npm-data')
        , require('./lib/routes/npm-pkg') // last
      ]


swig.setDefaults({
    root  : path.join(__dirname, 'views')
  , cache : isDev ? false : 'memory'
})

swig.setFilter('humanize', humanize)


var mount = st({
    path  : path.join(__dirname, './public')
  , url   : '/'
  , index : false
  , cache : isDev ? false : {}
})


var router = Router({
    errorHandler: function (req, res, err) {
      req.log.error(err)
      sendError(req, res, err)
    }

  , notFound: function (req, res) {
      if (mount(req, res))
        return

      sendPlain(req, res, {
          body: 'Not found: ' + req.url
        , statusCode: 404
      })
    }
})


routes.forEach(function (route) {
  if (!Array.isArray(route.path))
    return router.addRoute(route.path, route)

  route.path.forEach(function (path) {
    router.addRoute(path, route)
  })
})


function handler (req, res) {
  if (req.url == '/_status')
    return sendPlain(req, res, 'OK')

  // unique logger for each request
  req.log = reqLog(uuid.v4())
  req.log.info(req)

  res.setHeader('x-startup', start)
  res.setHeader('x-powered-by', 'whatevs')

  router(req, res)
}


http.createServer(handler)
  .on('error', function (err) {
    log.error(err)
    throw err
  })
  .listen(port, function (err) {
    if (err) {
      log.error(err)
      throw err
    }

    log.info('Server started on port %d', port)
    console.log()
    console.log('>> Running: http://localhost:' + port)
    console.log()
  })
