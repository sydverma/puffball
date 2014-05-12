/*
       _______  __   __  _______  _______  _______  _______  ___      ___     
      |       ||  | |  ||       ||       ||  _    ||   _   ||   |    |   |    
      |    _  ||  | |  ||    ___||    ___|| |_|   ||  |_|  ||   |    |   |    
      |   |_| ||  |_|  ||   |___ |   |___ |       ||       ||   |    |   |    
      |    ___||       ||    ___||    ___||  _   | |       ||   |___ |   |___ 
      |   |    |       ||   |    |   |    | |_|   ||   _   ||       ||       |
      |___|    |_______||___|    |___|    |_______||__| |__||_______||_______|                                                
 
  
  The core library for the puffball platform. 

  Currently a single flat file containing a mixture of parts; one day this will be the composite of modules at many levels.
  

  Future file system idea:

  puff.js

  /data
    data.js
    blockchain.js
    puffValidator.js

  /network
    network.js
    socket.js
    rtc.js
    localStorage.js
 */

Puff = {};

Puff.newPuffCallbacks = [];


Puff.init = function(zone) {
    // initialize the network layer 
    // slurp in available data
    // do other amazing things
  
  
    // next steps:
    // -- fix puff fields
    // -- get Puff.addPuff actually working w/ random sig
    // -- working parents/children in puffforum
    // ~- linked parents/children in puffforum
    // -- persist puffs
    // - fancy forum's db
    // -- get display working
    // -- use real keys 
    // - network access for initial load
    // -- network access for updates
  
    Puff.Data.getLocalPuffs(Puff.receiveNewPuffs)
    Puff.Data.getNewPuffs() // THINK: this should take a zone
    
    Puff.Blockchain.BLOCKS = Puff.Persist.get('blocks') 
    if(!Puff.Blockchain.BLOCKS)
        Puff.Blockchain.BLOCKS = {}
        
    if(CONFIG.noNetwork) return false // THINK: this is only for debugging and development

    Puff.Network.init()
}


Puff.createPuff = function(username, privatekey, zones, type, content, payload, previous) {
    //// Returns a new puff object. Does not hit the network, and hence does no real verification whatsoever.

    payload = payload || {}                             // TODO: check all of these values more carefully
    payload.content = content
    payload.type = type

    zones = zones || []
    previous = previous || false                        // false for DHT requests and beginning of blockchain, else valid sig

    var puff = { payload: payload
               , zones: zones
               , previous: previous
               , username: username
               , version: '0.0.2'                       // version accounts for crypto type and puff shape
               };                                       // early versions will be aggressively deprecated and unsupported

    puff.sig = Puff.Crypto.signData(puff, privatekey)

    return puff
}

Puff.buildKeyObject = function(privateDefaultKey, privateAdminKey, privateRootKey) {
    var publicDefaultKey = Puff.Crypto.privateToPublic(privateDefaultKey);
    var publicAdminKey   = Puff.Crypto.privateToPublic(privateAdminKey);
    var publicRootKey    = Puff.Crypto.privateToPublic(privateRootKey);
    
    var keys = { default: { 'private': privateDefaultKey
                          ,  'public': publicDefaultKey }
               ,   admin: { 'private': privateAdminKey
                          ,  'public': publicAdminKey }
               ,    root: { 'private': privateRootKey
                          ,  'public': publicRootKey }
               };
    
   return keys;
}


Puff.checkUserKey = function(username, privatekey) {
    return true; // oh dear. This is checked elsewhere, but should be here too!
}

 
Puff.addPuff = function(puff, privatekey) {
    //// add a puff to our local cache and fire the callback for new content
  
    Puff.receiveNewPuffs([puff]);

    Puff.Network.distributePuff(puff);
    
    // Puff.Blockchain.createBlock(puff.username, puff, privatekey);
}


Puff.receiveNewPuffs = function(puffs) {
    //// called by core Puff library any time puffs are added to the system
  
    puffs = Array.isArray(puffs) ? puffs : [puffs];                            // make puffs an array
  
    puffs.forEach(function(puff) { Puff.Data.eat(puff) });                     // cache all the puffs
  
    Puff.newPuffCallbacks.forEach(function(callback) { callback(puffs) });     // call all callbacks back
}


Puff.onNewPuffs = function(callback) {
    //// callback takes an array of puffs as its argument, and is called each time puffs are added to the system
  
    Puff.newPuffCallbacks.push(callback);
}



// DATA LAYER

Puff.Data = {};
Puff.Data.puffs = [];
Puff.Data.users = [];                                   // these are DHT user entries, not our local identity wardrobe

Puff.Data.eat = function(puff) {
    if(!!~Puff.Data.puffs
                   .map(function(p) {return p.sig})     // OPT: check the sig index instead
                   .indexOf(puff.sig)) 
                      return false 
    Puff.Data.puffs.push(puff);  
    Puff.Data.persist(Puff.Data.puffs);
}

Puff.Data.persist = function(puffs) {
    if(CONFIG.noLocalStorage) return false              // THINK: this is only for debugging and development
    Puff.Persist.save('puffs', puffs)                   // OPT: throttle this when we're chowing down on lots of puffs
}

Puff.Data.getLocalPuffs = function(callback) {
    // we're doing this asynchronously in order to not interrupt the loading process
    // should probably wrap this a bit better (use a promise, or setImmediate)
    return setTimeout(function() {callback(Puff.Persist.get('puffs') || [])}, 0)
}

Puff.Data.getNewPuffs = function() {
    var puffPromise = Puff.Network.getAllPuffs(); // OPT: only ask for puffs we're missing
    puffPromise.then(Puff.receiveNewPuffs)
}

Puff.Data.addUser = function(user) {
    Puff.Data.users.push(user);
    // TODO: index by username
    // TODO: persist to LS (maybe only sometimes? onunload? probabilistic?)
}

Puff.Data.verifyPuff = function(puff, callback) {
    // TODO: check previous sig, maybe
    // TODO: check for well-formed-ness
    
    // TODO: make this a promise instead
    Puff.Network.getUser(puff.username, function(user) {
        var defaultKey = user.defaultKey
        var result = Puff.Crypto.verifyPuffSig(puff, defaultKey)
        callback(result)
    })
}



// NETWORK LAYER

Puff.Network = {};
Puff.Network.peers = {}

Puff.Network.init = function() {
    //// fire up the networks (currently just the peer connections)
    
    Puff.Network.Peer = new Peer({  host: '162.219.162.56'
                                 ,  port: 9000
                                 ,  path: '/'
                                 , debug: 1
                                 });
    
    Puff.Network.Peer.on('open', Puff.Network.openPeerConnection);
    Puff.Network.Peer.on('connection', Puff.Network.connection);
}


Puff.Network.reloadPeers = function() {
    return Puff.Network.Peer.listAllPeers(Puff.Network.handlePeers);
};

Puff.Network.openPeerConnection = function(id) {
    return Puff.Network.Peer.listAllPeers(Puff.Network.handlePeers);
};

Puff.Network.connection = function(connection) {
    Puff.Network.reloadPeers(); // OPT: do we really need this? 

    return connection.on('data', function(data) {
        Puff.receiveNewPuffs(data);
    });
};

Puff.Network.handlePeers = function(peers) {
    peers.forEach(function(peer) {
        if(Puff.Network.peers[peer]) 
            return false;
        Puff.Network.peers[peer] = Puff.Network.Peer.connect(peer);
    });
};

Puff.Network.sendPuffToPeers = function(puff) {
    for(var peer in Puff.Network.peers) {
        Puff.Network.peers[peer].send(puff)
    }
}

Puff.Network.xhr = function(url, options, data) {
    //// very simple promise-based XHR implementation
    
    return new Promise(function(resolve, reject) {
        var req = new XMLHttpRequest();
        req.open(options.method || 'GET', url);
        
        Object.keys(options.headers || {}).forEach(function (key) {
          req.setRequestHeader(key, options.headers[key]);
        });
        
        if(data) {
            var formdata = new FormData()
            Object.keys(options.headers || {}).forEach(function (key) {
              formdata.append(key, data[key]);
            });
        }
        
        if(options && options.type)
            req.responseType = options.type
                
        req.onload = function() {
          if (req.status == 200)
            resolve(req.response);
          else 
            reject(Error(req.statusText));
        };

        req.onerror = function() {
          reject(Error("Network Error"));
        };

        req.send(formdata);
    });
}

Puff.Network.getJSON = function(url) {
    var options = { headers: { 'Accept': 'application/json' }
                  ,  method: 'GET'
                  ,    type: 'json'
                  }

    return Puff.Network.xhr(url, options)
}

Puff.Network.post = function(url, data) {
    var options = { headers: { 'Content-type': 'application/x-www-form-urlencoded' 
//                             , 'Content-length': params.length
//                             ,   'Connection': 'close'  
                             }
                  ,  method: 'POST'
                  }

    return Puff.Network.xhr(url, options, data)
}


Puff.Network.getAllPuffs = function() {
    //// get all the puffs from this zone
    // TODO: add zone parameter (default to CONFIG.zone)
    
    if(CONFIG.noNetwork) return false // NOTE: this is only for debugging and development

    var url = CONFIG.puffApi + '?type=getAllPuffs';
    return Puff.Network.getJSON(url);
}

Puff.Network.distributePuff = function(puff) {
    //// distribute a puff to the network
  
    if(CONFIG.noNetwork) return false // THINK: this is only for debugging and development
  
    // add it to the server's pufflist
    // THINK: this is fire-and-forget, but we should do something smart if the network is offline or it otherwise fails 
    $.ajax({
        type: "POST",
        url: CONFIG.puffApi,
        data: {
            type: "addPuff",
            puff: JSON.stringify(puff)
        },
        success:function(result){
            Puff.onError(JSON.stringify(result));      // TODO: make this smarter
        },
        error: function() {
            Puff.onError('Could not distribute puff', puff);
        }
    });
  
    // broadcast it to peers
    Puff.Network.sendPuffToPeers(puff)
}

Puff.Network.getUser = function(username, callback) {
    // TODO: call Puff.Network.getUserFile, add the returned users to Puff.Data.users, pull username's user's info back out, cache it in LS, then do the thing you originally intended via the callback (but switch it to a promise asap because that concurrency model fits this use case better)

    var my_callback = function(user) {
        Puff.Data.addUser(user);
        callback(user);
    }

    var errback = function() {   // TODO: make use of this
        Puff.onError('Unable to access user information from the DHT');
    }

    $.getJSON(CONFIG.userApi, {type: 'getUser', username: username}, my_callback);
}

Puff.Network.getUserFile = function(username, callback) {
    var my_callback = function(users) {
        Puff.Data.users = Puff.Data.users.concat(users);
        callback(username);
    }
  
    $.getJSON(CONFIG.userApi, {type: 'getUserFile', username: username}, my_callback);
}

Puff.Network.addAnonUser = function(keys, callback) {
    $.ajax({
        type: 'POST',
        url: CONFIG.userApi,
        data: { type: 'generateUsername'
              , rootKey: keys.root.public
              , adminKey: keys.admin.public
              , defaultKey: keys.default.public
              },
        success:function(result) {
            if(result.username) {
                if(typeof callback == 'function')
                callback(result.username)
                Puff.Blockchain.createGenesisBlock(result.username)
            } else {
                Puff.onError('Error Error Error: issue with adding anonymous user', result)
            }
        },
        error: function(err) {
            Puff.onError('Error Error Error: the anonymous user could not be added', err)
        },
        dataType: 'json'
    });
}

Puff.Network.sendUserRecordPuffToServer = function(puff, callback) {
    $.ajax({
        type: 'POST',
        url: CONFIG.userApi,
        data: { type: 'updateUsingPuff'
              , puff: puff
              },
        success:function(result) {
            if(typeof callback == 'function')
                callback(result)
        },
        error: function(err) {
            Puff.onError('Error Error Error: sending user record modification puff failed miserably', err)
        },
        dataType: 'json'
    });
}



/*
  Puff.Crypto

  Using bitcoin.js is pretty nightmarish for our purposes. 
  It pollutes everything with extraneous strings, always forces down to addresses, 
  and has a terrible API for compressed keys. Actually, the API is terrible in general.
  It's also not currently maintained and is dog slow.

  HOWEVER. 

  Until we get some real crypto experts on board or a new js lib comes out that has good community support, 
  leave this code alone.
*/

Puff.Crypto = {};

Puff.Crypto.generatePrivateKey = function() {
    return new Bitcoin.ECKey().toWif()
}

Puff.Crypto.privateToPublic = function(privateKeyWIF) {
    try {
        return Puff.Crypto.wifToPriKey(privateKeyWIF).getPub(true).toWif()
    } catch(err) {
        return Puff.onError('Invalid private key: could not convert to public key')
    }
}

Puff.Crypto.signData = function(unsignedPuff, privateKeyWIF) {
    //// sign the hash of some data with a private key and return the sig in base 58

    var prikey = Puff.Crypto.wifToPriKey(privateKeyWIF)
    var message = Puff.Crypto.puffToSiglessString(unsignedPuff)

    try {
        return Bitcoin.base58.encode(prikey.sign(message))
    } catch(err) {
        return Puff.onError('Could not properly encode signature')
    }
}

Puff.Crypto.verifyPuffSig = function(puff, defaultKey) {
    var puffString = Puff.Crypto.puffToSiglessString(puff);
    return Puff.Crypto.verifyMessage(puffString, puff.sig, defaultKey);
}

Puff.Crypto.verifyMessage = function(message, sig, publicKeyWIF) {
    //// accept a base 58 sig, a message (can be an object) and a base 58 public key. returns true if they match, false otherwise
  
    try {
        var pubkey = Puff.Crypto.wifToPubKey(publicKeyWIF)
        var sigBytes = Bitcoin.base58.decode(sig).toJSON()
        sigBytes = sigBytes.data || sigBytes
        return pubkey.verify(message, sigBytes)
    } catch(err) {
        return Puff.onError('Invalid key or sig: could not verify message')
    }
}

Puff.Crypto.wifToPriKey = function(privateKeyWIF) {
    try {
        return new Bitcoin.ECKey(privateKeyWIF, true)
    } catch(err) {
        return Puff.onError('Invalid private key: are you sure it is properly WIFfed?')
    }
}

Puff.Crypto.wifToPubKey = function(publicKeyWIF) {
    try {
        var pubkeyBytes = Bitcoin.base58check.decode(publicKeyWIF).payload.toJSON()
        pubkeyBytes = pubkeyBytes.data || pubkeyBytes
        return new Bitcoin.ECPubKey(pubkeyBytes, true)
    } catch(err) {
        return Puff.onError('Invalid public key: are you sure it is properly WIFfed?')
    }
}

Puff.Crypto.puffToSiglessString = function(puff) {
    return JSON.stringify(puff, function(key, value) {if(key == 'sig') return undefined; return value})
}



// Puff.Crypto.verifyBlock = function(block, publicKeyBase58) {
//     return Puff.Crypto.verifyMessage(block.blockPayload, block.blockSig.replace(/\*/g, ""), publicKeyBase58);
// }

// Puff.Crypto.signBlock = function(blockPayload, privateKeyWIF) {
//     return Puff.Crypto.signPayload(blockPayload, privateKeyWIF);
// }


/*

  Puff.Blockchain

  Each block is JSON Object.
  Fixed size: 10k bytes
  Fixed attributes:
    blockSig: (Size: 100 bytes)
    blockPayload:
      prevSig: (Size: 100 bytes)
      puff:
      padding:

  The blocks are stored in Puff.Blockchain.BLOCKS.
  BLOCKS is an object with properties that correspond
  to usernames and points to this users blockchain.
      Each users blockchain is an array, where the
  actual blocks relevant for this user are stored.
  
  Example:
    Puff.Blockchain.BLOCKS['username'] 
    retrieves the blockchain of 'username' as an array

*/

Puff.Blockchain = {};

Puff.Blockchain.BLOCKSIZE = 10000;
Puff.Blockchain.SIGSIZE = 100;

Puff.Blockchain.createBlock = function(username, puff, privateKeyWIF) {
    //// Creates a new block, by adding the payload (puff and the signature of the previous block), adding necessary padding and signing it 

    // is everything ok?
    if(!username) return Puff.onError('Could not create the block due to invalid username');
    
    var userBlockchain = Puff.Blockchain.BLOCKS[username];

    if(!userBlockchain) {
        Puff.Blockchain.createGenesisBlock(username);
        userBlockchain = Puff.Blockchain.BLOCKS[username];
    }
    
    if(!userBlockchain) return Puff.onError('Failed to create new block due to blockchain wonkiness');
    
    var prevSig = userBlockchain[userBlockchain.length - 1].blockSig

    // get a blank new block we can fill
    var newBlock = Puff.Blockchain.getNewBlankBlock();

    var paddingSize = Puff.Blockchain.BLOCKSIZE 
                    - 2*Puff.Blockchain.SIGSIZE 
                    - JSON.stringify(newBlock).length 
                    - JSON.stringify(puff).length 
                    + 2;

    // Why +2? Because we need to take the quotation marks of the
    // attributes into account. Turns out we need to add 2 in the end.

    // add the content
    newBlock.blockPayload.prevSig = Puff.Blockchain.paddSig(prevSig);
    newBlock.blockPayload.puff = puff
    newBlock.blockPayload.padding = Puff.Blockchain.generatePadding(paddingSize);

    // sign the content
    newBlock.blockSig = Puff.Blockchain.paddSig(Puff.Crypto.signBlock(newBlock.blockPayload, privateKeyWIF));

    Puff.Blockchain.BLOCKS[username].push(newBlock);
    Puff.Persist.save('blocks', Puff.Blockchain.BLOCKS);

    return newBlock.blockSig;
}

Puff.Blockchain.readBlock = function(username, sig) {
    var userBlockchain = Puff.Blockchain.BLOCKS.username;
    return userBlockchain[userBlockchain.indexOf(sig)]
}

Puff.Blockchain.updateBlock = function(username, sig, puff, privateKeyWIF) {
    var userBlockchain = Puff.Blockchain.BLOCKS.username;
    var newBlock = createBlock(userBlockchain[sig].blockPayload.prevSig, puff, privateKeyWIF);
    userBlockchain.splice(userBlockchain.indexOf(sig), userBlockchain.length);
    userBlockchain.push(newBlock);
    Puff.Persist.save('blocks', Puff.Blockchain.BLOCKS);
    return newBlock.blockSig;
}

Puff.Blockchain.deleteBlock = function(username, sig) {
    var userBlockchain = Puff.Blockchain.BLOCKS.username;
    userBlockchain.splice(userBlockchain.indexOf(sig), userBlockchain.length);
    Puff.Persist.save('blocks', Puff.Blockchain.BLOCKS);
}

Puff.Blockchain.getNewBlankBlock = function(){
    //// template of a blank block

    return {
        blockSig: "",
        blockPayload: {
            prevSig: "",
            puff: "",
            padding: ""
        }
    }

}

// TODO: Make random
Puff.Blockchain.generatePadding = function(size) {
    //// Generates padding content to ensure block size, for now just zeros

    var out = "0";
    while(out.length < size) {
        out = out + "0";
    }
    return out;
}

Puff.Blockchain.paddSig = function(sig) {
    //// Padds a signature to a length of 100 characters

    while(sig.length < Puff.Blockchain.SIGSIZE) {
        sig = sig + "*"
    }
    return sig
}

Puff.Blockchain.createGenesisBlock = function(username) {
    Puff.Blockchain.BLOCKS[username] = [];

    var newBlock = Puff.Blockchain.getNewBlankBlock();
    newBlock.blockSig = Puff.Blockchain.paddSig(username + "_1");

    Puff.Blockchain.BLOCKS[username].push(newBlock);
    return newBlock.blockSig;
}

Puff.Blockchain.exportChain = function(username){
    // Returns the username's blockchain as serialized JSON
    return Puff.Blockchain.BLOCKS[username];
}



/*
    Persistence layer

    It's like a network on your hard drive... which probably implies this should live in Puff.Network.
*/

Puff.Persist = {};

Puff.Persist.save = function(key, value) {
    // prepend PUFF:: so we're good neighbors
    var realkey = 'PUFF::' + key;
    var str = JSON.stringify(value);  // wrap this in a try/catch
    localStorage.setItem(realkey, str);
}

Puff.Persist.get = function(key) {
    var realkey = 'PUFF::' + key;
    var str = localStorage.getItem(realkey);
    if(!str) return false;
    return JSON.parse(str); // wrap this in a try/catch
}

Puff.Persist.remove = function(key) {
    var realkey = 'PUFF::' + key;
    localStorage.removeItem(realkey);
}


/// ERROR ERROR

Puff.onError = function(msg) {
    console.log(msg)
    return false
}