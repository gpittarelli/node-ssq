// Module imports
var pack = require('bufferpack');

// Creates a decoder that accepts a packet and either throws an
// error or returns the decoded data. Used to handle the common
// work that all decoders have to do, and then passes off
// to the supplied decode function
function make_decoder(type, decode) {
  return function (data, callback) {
    var values = pack.unpack('<i(header)c(type)', data);

    if (values === undefined) {
      callback(new Error('Packet isn\'t long enough'));
      return;
    }

    if (values.header === -2) {
      callback(new Error('SSQ response used unsupported split packet mode.'));
      return;
    }

    if (values.header !== -1) {
      callback(new Error('Unsupported packet header: ' + values.header));
      return;
    }

    if (values.type !== type) {
      callback(new Error('Unexpected packet type. Saw: ' + values.type
                                         + ' expected: ' + type));
      return;
    }

    decode(data.slice(5), callback);
  };
}

module.exports = {
  info: make_decoder('I', function info_decoder(data, callback) {
    // TODO: EDF field and optional values
    var fields = [
      'B(netver)'
    , 'S(servername)'
    , 'S(map)'
    , 'S(gamedirectory)'
    , 'S(gamedescription)'
    , 'H(appid)'
    , 'B(numplayers)'
    , 'B(maxplayers)'
    , 'B(numbots)'
    , 'c(servertype)'
    , 'c(os)'
    , 'B(password)'
    , 'B(vacsecured)'
    , 'S(gameversion)'
    , 'B(EDF)'
    ], format = '<' + fields.join('')
     , server_info = pack.unpack(format, data)

    // We should use pack.calcLength to determine how far into the data buffer
    // we read, however it doesn't work for format strings with named fields...
     , position = 1 + server_info.servername.length + 1
                + server_info.map.length + 1
                + server_info.gamedirectory.length + 1
                + server_info.gamedescription.length + 1
                + 2 + 1 + 1 + 1 + 1 + 1 + 1 + 1
                + server_info.gameversion.length + 1 + 1;

    if (server_info === undefined) {
      callback(new Error('Did not receive enough game info.'));
      return;
    }

    // Read in optional data values as specified by EDF. Order is important.
    if ( server_info.EDF & 0x80 ) {
      server_info.port = pack.unpack('<H(port)', data, position).port;
      position += 2;
    }

    if ( server_info.EDF & 0x10 ) {
      server_info.steamID = data.slice(position, position + 8);
      position += 8;
    }

    if ( server_info.EDF & 0x40 ) {
      server_info.sourceTV = pack.unpack('<H(port)S(name)', data, position);
      position += 2 + server_info.sourceTV.name.length + 1; // null terminator
    }

    if ( server_info.EDF & 0x20 ) {
      server_info.keywords = pack.unpack('<S', data, position)[0];
      position += server_info.keywords.length + 1;
    }

    if ( server_info.EDF & 0x01 ) {
      server_info.gameID = data.slice(position, position + 8);
      position += 8;
    }

    callback(null, server_info);
  }),

  players: make_decoder('D', function players_decoder(data, callback) {
    // Okay, we can probably read the first byte by ourselves:
    var player_cnt = data[0]
      , player
      , fields = ['B(index)', 'S(name)', 'l(score)', 'd(duration)']
      , format = '<' + fields.join('')
      , players = []
      , position = 1; // skip past the initial byte we read ourselves

    while (true) {
      player = pack.unpack(format, data, position);
      if (!player) {
        break;
      }

      players.push(player);

      // Could use pack.calcLength here - but this is simple enough:
      position += 1 // index
                + 4 // score
                + 8 // duration
                + player.name.length + 1; // name length + null byte
    }

    if (player_cnt != players.length) {
      callback(new Error('Did not receive the expected number of players.'
                             + ' Expected: ' + player_cnt
                             + ' But saw: '  + players.length));
    }

    callback(null, players);
  }),

  rules: make_decoder('E', function rules_decoder(data, callback) {
    // Okay, we can probably read the first byte by ourselves:
    var rules_cnt = pack.unpack('<H(count)').count
      , rule
      , fields = ['S(name)', 'S(value)']
      , format = '<' + fields.join('')
      , rules = []
      , position = 1; // skip past the initial byte we read ourselves

    while (true) {
      rule = pack.unpack(format, data, position);
      if (!rule) {
        break;
      }

      rules.push(rule);

      // Could use pack.calcLength here - but this is simple enough:
      position += rule.name.length + 1
                + rule.value.length + 1;
    }

    if (rules_cnt != rules.length) {
      callback(new Error('Did not receive the expected number of rules.'
                             + ' Expected: ' + rules_cnt
                             + ' But saw: '  + rules.length));
      return;
    }

    callback(null, rules);
  }),

  challenge: make_decoder('A', function challenge_decoder(data, callback) {
    // Don't bother parsing the challenge - just check its length.
    if (data.length !== 4) {
      callback(new Error('Challenge not 4 bytes'));
      return;
    }
    callback(null, data);
  })

};
