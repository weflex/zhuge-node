var express = require('express');
var httpProxy = require('http-proxy');
var http = require('http');
var debug = require('debug')('zhuge-node:server')
var ports = exports.ports = { source: 4063, proxy: 4064 };

/**
 * Proxy.
 */

var proxy = httpProxy.createProxyServer();

exports.proxy = http.createServer(function(req, res) {
  proxy.web(req, res, { target: 'http://localhost:' + ports.source });
});

proxy.on('proxyRes', function (proxyRes, req, res) {
  proxyRes.statusCode = 408;
});

/**
 * App.
 */

exports.app = express()
  .use(express.bodyParser())
  .use(express.basicAuth('key', ''));

/**
 * Fixture.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Funtion} next
 */

exports.fixture = function(req, res, next){
  var batch = req.body.data;
  if ('error' == batch[0]) {
    return res.json(400, {
      'return_code': -1000,
      'return_message': 'error'
    });
  }
  res.json({ 'return_code': 0 });
}
