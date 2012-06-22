/* Source Server Query (SSQ) library
 * Author : George Pittarelli
 *
 * SSQ protocol is specified here:
 * https://developer.valvesoftware.com/wiki/Server_queries
 */

// Module imports
var dgram = require('dgram');

// Message request formats, straight from the spec
var A2A_PING = "i"
  , A2S_SERVERQUERY_GETCHALLENGE = "\xFF\xFF\xFF\xFF\x57"
  , A2S_INFO = "\xFF\xFF\xFF\xFFTSource Engine Query\x00"
  // The following messages require challenge values to be appended to them
  , A2S_PLAYER = "\xFF\xFF\xFF\xFF\x55"
  , A2S_RULES = "\xFF\xFF\xFF\xFF\x56";

module.exports = {




};