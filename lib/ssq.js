/* Source Server Query (SSQ) library
 * Author : George Pittarelli
 *
 * SSQ protocol is specified here:
 * https://developer.valvesoftware.com/wiki/Server_queries
 */

// Module imports
var dgram = require('dgram');

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

function get_challenge(server, port, callback) {
  function receive_challenge(challenge) {
    callback(null, challenge);
  }

  function error_handler(err, bytes) {
    callback(err);
  }

  // TODO: Choose between udp4 or udp6 intelligently
  var socket = dgram.createSocket('udp4', receive_challenge);
  socket.send(A2S_SERVERQUERY_GETCHALLENGE, 0,
              A2S_SERVERQUERY_GETCHALLENGE.length,
              port, server, error_handler);
}

function ssq_request(server, port, request, needs_challenge, callback) {
  function receive_data(challenge) {
    callback(null, challenge);
  }

  function error_handler(err, bytes) {
    callback(err);
  }

  var socket = dgram.createSocket('udp4', receive_data);
  socket.send(request, 0, request.length, port, server, error_handler);
}

// Factory to make the methods we are exporting:
function make_request_method(request, needs_challenge) {
  needs_challenge = !!needs_challenge;
  return function(server, port, callback) {
    ssq_request(server, port, request, needs_challenge, callback);
  };
}

module.exports = {
  ping: make_request_method(A2A_PING)
, info: make_request_method(A2S_INFO)
, players: make_request_method(A2S_PLAYER, true)
, rules: make_request_method(A2S_RULES, true)

, test_challenge: get_challenge
};