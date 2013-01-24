// Module imports
var pack = require('bufferpack');

// Creates a decoder that accepts a packet and either throws an
// error or returns the decoded data. Used to handle the common
// work that all decoders have to do, and then passes off
// to the supplied decode function
function make_decoder(type, decode) {
  return function(data, callback) {
    var values = pack.unpack('<i(header)c(type)', data);

    if (values === undefined)
      throw new Error("Packet isn't long enough");

    if (values.header !== -1)
      throw new Error("Unsupported packet header: " + values.header);

    if (values.type !== type)
      throw new Error("Unexpected packet typ. Saw: " + values.type
                                     + " expected: " + type);

    decode(data.slice(5), callback);
  };
}

module.exports = {
  info: make_decoder('I', function(data) {
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
    ], format = '<' + fields.join('');
    var values = pack.unpack(format, data);

    if (values === undefined) {
      throw new Error("Not enough game info");
    }

    return values;
  })


};
