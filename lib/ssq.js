/* Source Server Query (SSQ) library
 * Author : George Pittarelli
 *
 * SSQ protocol is specified here:
 * https://developer.valvesoftware.com/wiki/Server_queries
 */

// Module imports
var dgram = require('dgram')
  , pack = require('bufferpack')
  , decoders = require('./decoders.js');

// Message request formats, straight from the spec
var A2A_PING = new Buffer("i")
  , A2S_SERVERQUERY_GETCHALLENGE = new Buffer([0xff, 0xff, 0xff, 0xff, 0x57])
  //  "\xFF\xFF\xFF\xFFTSource Engine Query\x00
  , A2S_INFO = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0x54, 0x53, 0x6F, 0x75, 0x72,
                         0x63, 0x65, 0x20, 0x45, 0x6E, 0x67, 0x69, 0x6E, 0x65,
                         0x20, 0x51, 0x75, 0x65, 0x72, 0x79, 0x00])
  // The following messages require challenge values to be appended to them
  // so we leave them as raw strings and build the Buffer objects as we need
  // them
  , A2S_PLAYER = new Buffer([0xff, 0xff, 0xff, 0xff, 0x55])
  , A2S_RULES = new Buffer([0xff, 0xff, 0xff, 0xff, 0x56]);

var get_challenge = make_request_method(A2S_SERVERQUERY_GETCHALLENGE);

function ssq_request(server, port, request, decoder,
                     needs_challenge, callback) {
  needs_challenge = !!needs_challenge;
  callback = callback || function(){};

  function receive_data(data) {
    decoder(data, callback);
  }

  function error_handler(err, bytes) {
    callback(err);
  }

  var socket = dgram.createSocket('udp4', receive_data);
  socket.send(request, 0, request.length, port, server, error_handler);
}

// Factory to make the methods we are exporting:
function make_request_method(request, decoder, needs_challenge) {
  needs_challenge = !!needs_challenge;
  return function(server, port, callback) {
    ssq_request(server, port, request, decoder, needs_challenge, callback);
  };
}

module.exports = {
  ping: make_request_method(A2A_PING)
, info: make_request_method(A2S_INFO, decoders.info)
, get_challenge: get_challenge
, players: make_request_method(A2S_PLAYER, true)
, rules: make_request_method(A2S_RULES, true)
};