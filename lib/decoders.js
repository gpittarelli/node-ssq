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
     , server_info = pack.unpack(format, data);

    if (server_info === undefined) {
      callback(new Error('Did not receive enough game info.'));
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
    }

    callback(null, rules);
  }),

  challenge: make_decoder('A', function challenge_decoder(data, callback) {
    // Don't bother parsing the challenge - just check its length.
    if (data.length !== 4) {
      callback(new Error('Challenge not 4 bytes'));
    }
    callback(null, data);
  })

};
