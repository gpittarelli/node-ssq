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
      , player, ch, str_len, rem
      , players = []
      , position = 1; // skip past the initial byte we read ourselves

    // Unfortunately, the bufferpack library doesn't support reading utf-8
    // strings (it assumes ASCII and doesn't have an option! wtf!), so we
    // have to do this manually... The only real solution would be to update
    // bufferpack (which hasn't been touched in a year) or switch libraries,
    // which I don't want to do at this point.
    while (position < data.length) {
      player = {
        index: 0,
        name: "",
        score: 0,
        duration: 0
      };

      // Read player index (1 byte)
      player.index = data[position++];

      // Find length of null-terminated player name:
      ch = data[position];
      str_len = 1;
      while (ch !== 0 && (position + str_len) < data.length) {
        ch = data[position + str_len];
        str_len++;
      }

      // TODO: Error checking if the message isn't properly terminated

      // Read string using proper native Buffer.toString, which support utf8
      // This could probably be combined with the above loop.
      player.name = data.toString('utf8', position, position + str_len - 1);
      position += str_len;

      // We can at least use pack.unpack at this point for the reamining values
      // so we don't have to handle the endianess ourselves.
      rem = pack.unpack('<l(score)f(duration)', data, position);
      player.score = rem.score;
      player.duration = rem.duration;
      position += 8;

      players.push(player);
    }

    /* players_cnt may not equal the number of players in the list if players
       are currently connecting to the server, so this is not an error.

    if (player_cnt != players.length) {
      callback(new Error('Did not receive the expected number of players.'
                             + ' Expected: ' + player_cnt
                             + ' But saw: '  + players.length));
    }
    */

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
