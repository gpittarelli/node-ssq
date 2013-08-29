node-ssq
========

A Node.JS library for sending Source Server Queries (SSQ) to source engine
powered game servers (TF2, L4D, etc.).

I recommend glancing over the following Valve dev wiki page about SSQ:

https://developer.valvesoftware.com/wiki/Server_queries

## WARNING
I created this library and shortly after didn't need it anymore. It
should work fine, but has not been aggresively tested.

## Known issue
Some long messages may be split into chunks or compressed.
Neither of these modes are currently supported. If you see an error like:

    SSQ response used unsupported split packet mode.

then you're out of luck. Currently I only get this message when
requesting the rules list from some servers.

## API
The API is very simple. All functions are passed a server string
(dotted quad ipv4 address or domain name), a port number, and a callback
function that takes an error as the first parameter and the returned data
as the second parameter.

All the below examples assume this library is imported as `ssq`:

    var ssq = require('node-ssq');

### Request timeout

    ssq.set_timeout(1500);

Sets the timeout in milliseconds (ms) for all SSQ requests (Default:
2000ms, available as ssq.DEFAULT_TIMEOUT). Because SSQ requests are
sent over UDP instead of TCP, timeouts are the only way of determining
if a request has failed.

Note: If data that comes in after a timeout has expired will be
silently dropped.

### Ping

    ssq.ping('1.23.45.67', 1337, function (err, data) {});

Pings the server. *This message has been deprecated by Valve, and doesn't serve
much of a use...*

### Server info

    ssq.info('1.23.45.67', 1337, function (err, data) {});

Returns a single object with a lot of data about the server.

    { netver: 17,
      servername: 'Reddit Unofficial Gaming Community - East Coast',
      map: 'pl_upward',
      gamedirectory: 'tf',
      gamedescription: 'Team Fortress',
      appid: 440,
      numplayers: 23,
      maxplayers: 24,
      numbots: 0,
      servertype: 'd',
      os: 'l',
      password: 0,
      vacsecured: 1,
      gameversion: '1.2.1.0',
      EDF: 177,

      // The following properties are each individually optional
      port: 27015,
      steamID: <Buffer 02 e4 1e 81 af 0c 40 01>,
      sourceTV: { port: 27020, name: 'SourceTV' },
      keywords: '_registered,alltalk,east,nocrits,nodmgspread,payload,reddit,replays,rugc',
      gameID: <Buffer b8 01 00 00 00 00 00 00> }

Most of these values should be self explanatory.

The **EDF** value is a flag for the optional values. You shouldn't need to look at this flag yourself.

**steamID** and **gameID** are 64 bit values, so they are returned as node.js Buffer objects with 8 bytes. Note that all JavaScript numbers are 64-bit floating point numbers, with only 53 bits of precision, so 64 bit values should not be handled as primitive JavaScript numbers.

### Players list

    ssq.players('1.23.45.67', 1337, function (err, data) {});

Returns an array of players. Sample data:

    [{ index: 0,
       name: 'Sample Name',
       score: 2,
       duration: 267.5876159667969 }, ...]

Note that the **index** attribute seems to always be 0, and the **duration** is in seconds.

### Server rules

    ssq.rules('1.23.45.67', 1337, function (err, data) {});

Returns an array of server rules. Sample data:

    [{ name: 'sv_cheats', value: '1'}, ...]

### Get challenge

    ssq.get_challenge('1.23.45.67', 1337, function (err, data) {});

Queries the server for a challenge number, used by some of the requests. This
method probably won't be needed by anybody, but is provided for completeness
of the SSQ API.

    <Buffer b8 a4 c3 0f>
