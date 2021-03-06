/*
       _______  __   __  _______  _______  _______  _______  ___      ___     
      |       ||  | |  ||       ||       ||  _    ||   _   ||   |    |   |    
      |    _  ||  | |  ||    ___||    ___|| |_|   ||  |_|  ||   |    |   |    
      |   |_| ||  |_|  ||   |___ |   |___ |       ||       ||   |    |   |    
      |    ___||       ||    ___||    ___||  _   | |       ||   |___ |   |___ 
      |   |    |       ||   |    |   |    | |_|   ||   _   ||       ||       |
      |___|    |_______||___|    |___|    |_______||__| |__||_______||_______|                                                
 
  
    The core library for the puffball platform. 
    
    Most calls to the platform should go through here, rather than accessing other core modules like PB.Data and PB.Crypto directly.
    
    
    Future file system idea:
    
    PB.js
    
    /data
      Data.js
      PuffValidator.js
    
    /net
      Net.js
      Socket.js
      RTC.js
      LocalStorage.js

    /crypto
      Crypto.js


*/

PB = {};

PB.Modules = {}
PB.M = PB.Modules

PB.newPuffCallbacks = [];

/**
 * initialize the network layer;  
 * slurp in available data;  
 * do other amazing things
 * @param  {array} zone array of zones
 */
PB.init = function(zone) {
    PB.Data.depersistUserRecords()
    
    PB.Data.importShells()
    
    if(CONFIG.noNetwork) return false // THINK: this is only for debugging and development
    
    PB.Net.init()
}


/**
 * build a new puff object based on the parameters;  
 * does not hit the network, hence does no real verification whatsoever
 * @param  {string} username                    user who sign the puff
 * @param  {string} privatekey                  private default key for the user
 * @param  {string} routes                      routes of the puff
 * @param  {string} type                        type of the puff
 * @param  {string} content                     content of the puff
 * @param  {object} payload                     other payload information for the puff
 * @param  {string} previous                    most recently published content by the user
 * @param  {object} userRecordsForWhomToEncrypt
 * @param  {object} privateEnvelopeAlias
 * @return {object}                             the new puff object
 */
PB.buildPuff = function(versionedUsername, privatekey, routes, type, content, payload, previous, userRecordsForWhomToEncrypt, privateEnvelopeAlias) {
    var puff = PB.packagePuffStructure(versionedUsername, routes, type, content, payload, previous)

    puff.sig = PB.Crypto.signPuff(puff, privatekey)
    if(userRecordsForWhomToEncrypt) {
        puff = PB.encryptPuff(puff, privatekey, userRecordsForWhomToEncrypt, privateEnvelopeAlias)
    }
    
    return puff
}


PB.simpleBuildPuff = function(routes, type, content, payload, userRecordsForWhomToEncrypt, privateEnvelopeAlias) {
    var puff 
    
    PB.useSecureInfo(function(identities, currentUsername, privateRootKey, privateAdminKey, privateDefaultKey) {
        var previous = false // TODO: get the sig of this user's latest puff
        var versionedUsername = PB.getCurrentVersionedUsername()
        
        puff = PB.buildPuff(versionedUsername, privateDefaultKey, routes, type, content, payload, previous, userRecordsForWhomToEncrypt, privateEnvelopeAlias)
    })
    
    return puff
}


/**
 * pack all the parameters into an object with puff structure (without signature)
 * @param  {string} username 
 * @param  {string[]} routes
 * @param  {string} type     
 * @param  {string} content  
 * @param  {object} payload  
 * @param  {string} previous 
 * @return {object}          object which has similar structure as a puff (without signature)
 */
PB.packagePuffStructure = function(versionedUsername, routes, type, content, payload, previous) {
    payload = payload || {}                             // TODO: check all of these values more carefully
    payload.content = content
    payload.type = type

    routes = routes || []
    previous = previous || false                        // false for DHT requests and beginning of blockchain, else valid sig

    var puff = { username: versionedUsername
               ,   routes: routes
               , previous: previous
               ,  version: '0.1.0'                      // version accounts for crypto type and puff shape
               ,  payload: payload                      // early versions will be aggressively deprecated and unsupported
               }
    
    return puff
}

/**
 * returns a canonical user object: use this everywhere user objects are needed (DHT, identities, etc)
 * @param  {string} username   
 * @param  {string} defaultKey public default key
 * @param  {string} adminKey   public admin key
 * @param  {string} rootKey    public root key
 * @param  {string} latest     signature of the most recent puff published by the user
 * @param  {string} updated    date of the most recent update to the username
 * @return {object}            a canonical user object
 */
PB.buildUserRecord = function(username, defaultKey, adminKey, rootKey, latest, updated, profile, capa) {
    latest  = latest  || ""
    updated = updated || ""
    profile = profile || ""
    capa    = capa    || 1
    
    // THINK: should we check for valid keys? valid timestamp for updated? what if you want a partially invalid user like anon?

    if(!PB.validateUsername(username))
        return false; // already logged the error
    
    // these keys are PUBLIC. only public keys here. no other types of keys. 
    
    return {   username: username
           ,       capa: capa
           ,    rootKey: rootKey
           ,   adminKey: adminKey
           , defaultKey: defaultKey
           ,     latest: latest
           ,    updated: updated
           ,    profile: profile
           }
}

/**
 * check if a username is valid
 *     a username must be shorter than 256 characters, all lowercase and contains only alphanumeric and . sign
 * @param  {string} username the string to be check
 * @return {boolean}          return true if  the parameter string is a valid username, otherwise throw error
 */
PB.validateUsername = function(username) {
    if(!username) 
        return PB.onError('Username is required', username)

    if(username.length > 256) 
        return PB.onError('Usernames must be shorter than 256 characters', username)

    if(username != username.toLowerCase()) 
        return PB.onError('Usernames must be lowercase', username)
    
    if(!/^[0-9a-z.]+$/.test(username))
        return PB.onError('Usernames must be alphanumeric', username)
    
    return true;
}

PB.userRecordToVersionedUsername = function(userRecord) {
    return PB.makeVersionedUsername(userRecord.username, userRecord.capa)
}

PB.usernameFromVersioned = function(versionedUsername) {
    var uc = PB.breakVersionedUsername(versionedUsername)
    return uc.username
}

PB.maybeVersioned = function(username, capa) {
    if(!username)
        return ''
    
    if(capa)
        return PB.makeVersionedUsername(username, capa)
    
    if(username.indexOf(':') > 0)
        return username
    
    return PB.makeVersionedUsername(username)
}

PB.makeVersionedUsername = function(username, capa) {
    capa = capa || 1 // NOTE: default capa
    return username + ':' + capa
}

PB.breakVersionedUsername = function(versionedUsername) {
    var list = (versionedUsername||'').split(':')

    return { username: list[0]
           , capa:     list[1] || 1 // NOTE: default capa
           }
}


PB.updatePrivateKey = function(keyToModify, newPrivateKey, secrets) {
    //// attempts to update a private key for the current user. 
    //// if successful it adds the new alias to the current identity.
    //// returns a promise for the new userRecord.
    
    var username = PB.getCurrentUsername()
    var newPublicKey = PB.Crypto.privateToPublic(newPrivateKey)

    var payload = {}
    var routes = []
    var type = 'updateUserRecord'
    var content = 'modifyUserKey'

    payload.keyToModify = keyToModify
    payload.newKey = newPublicKey
    payload.time = Date.now()

    var prom = new Promise(function(resolve, reject) {
        var puff

        PB.useSecureInfo(function(identities, currentUsername, privateRootKey, privateAdminKey, privateDefaultKey) {
            // NOTE: puff leaks, but only contains publicly accessible data
        
            var signingUserKey = 'privateRootKey'  // changing admin or root keys requires root privileges
            var privateKey = privateRootKey

            if (keyToModify == 'defaultKey') { 
                signingUserKey = 'privateAdminKey' // changing the default key only requires admin privileges
                privateKey = privateAdminKey
            }

            if(!privateKey) {
                return reject(PB.makeError("You need the " + signingUserKey + " to change the " + keyToModify + " key."))
            } else {
                puff = PB.buildPuff(username, privateKey, routes, type, content, payload)
            }
        })

        var userRecordPromise = PB.Net.updateUserRecord(puff)

        userRecordPromise.then(function(userRecord) {
            if(keyToModify == 'defaultKey') {
                PB.useSecureInfo(function(identities, currentUsername, privateRootKey, privateAdminKey, privateDefaultKey) {
                    PB.addAlias(currentUsername, currentUsername, userRecord.capa, privateRootKey, privateAdminKey, newPrivateKey, secrets)
                })
            }

            if(keyToModify == 'adminKey') {
                PB.useSecureInfo(function(identities, currentUsername, privateRootKey, privateAdminKey, privateDefaultKey) {
                    PB.addAlias(currentUsername, currentUsername, userRecord.capa, privateRootKey, newPrivateKey, privateDefaultKey, secrets)
                })
            }

            if(keyToModify == 'rootKey') {
                PB.useSecureInfo(function(identities, currentUsername, privateRootKey, privateAdminKey, privateDefaultKey) {
                    PB.addAlias(currentUsername, currentUsername, userRecord.capa, newPrivateKey, privateAdminKey,  privateDefaultKey, secrets)
                })
            }

            resolve(userRecord)
        })
        .catch(function(err) {
            reject(PB.makeError(err))
        })
    })

    return prom
}


/**
 * to process user records
 * @param  {string} userRecord
 * @return {object}
 */
PB.processUserRecord = function(userRecord) {
    //// Use this on all incoming user records
    
    userRecord = PB.buildUserRecord(userRecord.username, userRecord.defaultKey, userRecord.adminKey, userRecord.rootKey, userRecord.latest, userRecord.updated, userRecord.profile, userRecord.capa);
    
    if(!userRecord)
        return PB.onError('That is not an acceptable user record', userRecord);
    
    PB.Data.cacheUserRecord(userRecord);
    
    return userRecord;
}

/**
 * checks the cache, and always returns a promise
 * @param {string} username
 * @returns {object} Promise for a user record
 * Looks first in the cache, then grabs from the network
 */
PB.getUserRecord = function(username, capa) {
    //// This always checks the cache, and always returns a promise
    
    var versionedUsername = PB.maybeVersioned(username, capa)
    
    var userRecord = PB.Data.getCachedUserRecord(versionedUsername);
    
    if(userRecord)
        return Promise.resolve(userRecord);
    
    var userPromise = PB.Data.userPromises[versionedUsername];
    
    if(userPromise)
        return userPromise;
    
    return PB.getUserRecordNoCache(versionedUsername);
}

/**
 * Forces a request to the network, ignores cached
 * @param {string} username
 * @returns {object} Promise for a user record
 */
PB.getUserRecordNoCache = function(username, capa) {
    //// This never checks the cache
    
    capa = capa || 0 // 0 signals PB.Net.getUserRecord to get the latest userRecord
    
    var prom = PB.Net.getUserRecord(username, capa); 
    
    var versionedUsername = PB.maybeVersioned(username, capa)
    PB.Data.userPromises[versionedUsername] = prom
    
    return prom;
}

/**
 * returns a puff from a shell
 * @param  {(string|object)} shell a string which is a signature of a puff; or an object contains partial information of a puff
 * @return {object} returns a puff based on the shell; returns false if the shell is empty
 */
PB.getPuffFromShell = function(shell_or_sig) {
    if(!shell_or_sig)
        return false // false so we can filter empty shells out easily, while still loading them on demand
    
    if(shell_or_sig.payload && shell_or_sig.payload.content !== undefined)
        return shell_or_sig // it's actually a full blown puff
    
    var sig = shell_or_sig.sig || shell_or_sig
    
    return PB.Data.getPuffBySig(sig) // returns a puff, or asks the network and returns false
}

/**
 * handle a newly created puff: add to our local cache and fire new content callbacks
 * @param {object} puff
 */
PB.addPuffToSystem = function(puff) {
    
    if(PB.Data.getCachedShellBySig(puff.sig)) return false
    
    PB.Data.addShellsThenMakeAvailable(puff);

    PB.Net.distributePuff(puff);
    
    return puff;
}

/**
 * it is called by core Puff library any time puffs are added to the system
 * @param  {Puff[]} puffs
 * @return {Puff[]}
 */
PB.receiveNewPuffs = function(puffs) {
    //// called by core Puff library any time puffs are added to the system
    
    // TODO: this is only called from PB.Data.makeShellsAvailable -- pull this down there or rethink it all
    
    puffs = Array.isArray(puffs) ? puffs : [puffs];                                 // make puffs an array

    // THINK: why didn't we allow shells through here, and should we in the future?
    //        if we don't, find a different way in getAncestors and getDescendants to add edges to shells
    // puffs = puffs.filter(function(puff) {
    //     return puff.payload && puff.payload.content !== undefined})                 // no partial puffs
    
    PB.newPuffCallbacks.forEach(function(callback) { callback(puffs) });      // call all callbacks back
    
    return puffs;
}

/**
 * add new callback which is called when a new puff added to the system
 * @param  {Function} callback takes an array of puff as its argument, and is called each time puffs are added to the system
 */
PB.onNewPuffs = function(callback) {
    //// use this to add a new hook into the receiveNewPuffs cycle
    PB.newPuffCallbacks.push(callback);
}

PB.addRelationship = function(callback) {
    //// use this to add a new hook into the receiveNewPuffs cycle
    PB.newPuffCallbacks.push(callback);
}

/**
 * return an encrypted version of the puff. this has to be done before signing. userRecords must be fully instantiated.
 * @param  {object} puff
 * @param  {string} myPrivateWif
 * @param  {string} userRecords
 * @return {object}
 */
PB.encryptPuff = function(letter, myPrivateWif, userRecords, privateEnvelopeAlias) {
    //// stick a letter in an envelope. userRecords must be fully instantiated.
    var puffkey = PB.Crypto.getRandomKey()                                        // get a new random key
    
    var letterCipher = PB.Crypto.encryptWithAES(JSON.stringify(letter), puffkey)  // encrypt the letter
    var versionedUsername = letter.username
    
    if(privateEnvelopeAlias) {
        myPrivateWif = privateEnvelopeAlias.default
        versionedUsername = PB.makeVersionedUsername(privateEnvelopeAlias.username, privateEnvelopeAlias.capa)
    }
    
    var envelope = PB.packagePuffStructure(versionedUsername, letter.routes       // envelope is also a puff
                           , 'encryptedpuff', letterCipher, {}, letter.previous)  // it includes the letter
    
    envelope.keys = PB.Crypto.createKeyPairs(puffkey, myPrivateWif, userRecords)  // add decryption keys
    envelope.sig = PB.Crypto.signPuff(envelope, myPrivateWif)                     // sign the envelope
    
    return envelope
}

/**
 * to decrypt a puff
 * @param  {object} puff
 * @param  {string} yourPublicWif
 * @param  {string} myUsername
 * @param  {string} myPrivateWif
 * @return {object}
 */
PB.getDecryptedPuffPromise = function(envelope) {
    //// pull a letter out of the envelope -- returns a promise!

    if(!envelope || !envelope.keys) 
        return PB.onError('Envelope does not contain an encrypted letter')
    
    var yourVersionedUsername   = envelope.username
    var yourVersionedUserRecord = PB.Data.getCachedUserRecord(yourVersionedUsername)
    var prom = PB.emptyPromise()
    
    PB.useSecureInfo(function(identites, currentUsername) {
        // NOTE: leaks a promise which resolves to unencrypted puff
        
        var keylist = Object.keys(envelope.keys)
        var versionedUsername = PB.getUsernameFromList(keylist, currentUsername)
        if(!versionedUsername)
            return PB.onError('No key found for current user')
        
        var alias = PB.getAliasByVersionedUsername(identites, versionedUsername)
        var privateDefaultKey = alias.privateDefaultKey
        // letter = PB.decryptPuff(envelope, yourUserRecord.defaultKey, currentUsername, privateDefaultKey)

        prom = new Promise(function(resolve, reject) {
            PB.workersend('decryptPuffForReals', [envelope, yourVersionedUserRecord.defaultKey, versionedUsername, privateDefaultKey], resolve, reject)
        })
    })

    return prom
}

PB.decryptPuffForReals = function(envelope, yourPublicWif, myVersionedUsername, myPrivateWif) {
    if(!envelope.keys) return false
    var keyForMe = envelope.keys[myVersionedUsername]
    var puffkey  = PB.Crypto.decodePrivateMessage(keyForMe, yourPublicWif, myPrivateWif)
    var letterCipher = envelope.payload.content
    var letterString = PB.Crypto.decryptWithAES(letterCipher, puffkey)
    letterString = PB.tryDecodeOyVey(escape(letterString)); // encoding
    return PB.parseJSON(letterString)
}

// PB.decryptPuff -> PB.decryptPuffForReals if there's no PB.cryptoworker
// returns a promise that resolves to the decrypted whatsit. 
// update forum function and filesystem call site
// maybe make worker promise wrapper layer

PB.tryDecodeOyVey = function(str) {
    //// decodeURIComponent throws, so we wrap it. try/catch kills the optimizer, so we isolate it.
    try {
        return decodeURIComponent(str)
    } catch(err) {
        return PB.onError('Invalid URI string', err)
    }
}



////////////// SECURE INFORMATION INTERFACE ////////////////////

PB.implementSecureInterface = function(useSecureInfo, addIdentity, addAlias, setPreference, switchIdentityTo, removeIdentity) {
    // useSecureInfo    = function( function(identities, username, privateRootKey, privateAdminKey, privateDefaultKey) )
    // addIdentity      = function(username, aliases, preferences)
    // addAlias         = function(identityUsername, aliasUsername, capa, privateRootKey, privateAdminKey, privateDefaultKey, secrets)
    // removeIdentity   = function(username)
    // setPreference    = function(key, value) // for current identity
    // switchIdentityTo = function(username)

    // THINK: consider ensuring all functions are present first, so it's harder to mix and match wardrobe implementations
    
    if(typeof useSecureInfo == 'function') {
        PB.useSecureInfo = function(callback) {
            // NOTE: useSecureInfo returns true if there is a current identity, and false otherwise
            return useSecureInfo( function(identities, username, privateRootKey, privateAdminKey, privateDefaultKey) {
                var clonedIdentities = JSON.parse(JSON.stringify(identities)) // prevent accidental mutation
                callback(clonedIdentities, username, privateRootKey, privateAdminKey, privateDefaultKey)
            })
        }
    }
    
    if(typeof addIdentity == 'function')
        PB.addIdentity = addIdentity
        
    if(typeof addAlias == 'function')
        PB.addAlias = addAlias
        
    if(typeof setPreference == 'function')
        PB.setPreference = setPreference
        
    if(typeof switchIdentityTo == 'function')
        PB.switchIdentityTo = switchIdentityTo
        
    if(typeof removeIdentity == 'function')
        PB.removeIdentity = removeIdentity
        
    PB.getCurrentUsername = function() {
        // yes, this technique allows you to leak data out of useSecureInfo. no, you should not use it.
        var output
        PB.useSecureInfo(function(identities, username) { output = username })
        return output
    }
    
    PB.getCurrentCapa = function() {
        // yes, this technique allows you to leak data out of useSecureInfo. no, you should not use it.
        var output
        PB.useSecureInfo(function(identities, username) { output = ((identities[username]||{}).primary||{}).capa||0 })
        return output
    }
    
    PB.getCurrentVersionedUsername = function() {
        var username = PB.getCurrentUsername()
        if(!username)
            return PB.onError('No current user in wardrobe')
        
        return PB.makeVersionedUsername(username, PB.getCurrentCapa())
    }
    
    PB.getAllIdentityUsernames = function() {
        // yes, this technique allows you to leak data out of useSecureInfo. no, you should not use it.
        var output
        PB.useSecureInfo(function(identities, username) { output = Object.keys(identities) })
        return output
    }
    
    PB.getCurrentUserRecord = function() {
        var versionedUsername = PB.getCurrentVersionedUsername()
        if(!versionedUsername)
            return false
        
        // THINK: it's weird to hit the cache directly from here, but if we don't then we always get a promise,
        //        even if we hit the cache, and this should return a proper userRecord, not a promise, 
        //        since after all we have stored the userRecord in our wardrobe, haven't we?
    
        var userRecord = PB.Data.userRecords[versionedUsername]
        if(!userRecord)
            return PB.onError('That user does not exist in our records')
    
        return userRecord
    }
    
    PB.getAliasByVersionedUsername = function(identities, username, capa) {
        // this requires identities to be the list of identities from PB.useSecureInfo
        
        if(!identities || typeof identities != 'object') 
            return PB.onError('Invalid identities')
        if(!username) 
            return PB.onError('Non-existent username')
        
        var versionedUsername = PB.maybeVersioned(username, capa)
        var uc = PB.breakVersionedUsername(versionedUsername)
        username = uc.username
        capa = uc.capa
        
        var identity = identities[username]
        if(!identity)
            return PB.onError('An identity matching that username could not be found') || {}
        
        var alias = identity.aliases.filter(function(alias) {
            return alias.capa == capa && alias.username == username
        })
        return alias[0] || {}
    }
    
    PB.getUsernameFromList = function(list, username) {
        for(var i = 0; i < list.length; i++) {
            var key = list[i]
            if(username == PB.breakVersionedUsername(key).username)
                return key
        }
        return false
    }

}

////////////// END SECURE INFORMATION ZONE ////////////////////

PB.formatIdentityFile = function(username) {
    // THINK: consider passphrase protecting the identity file by default
    
    username = username || PB.getCurrentUsername()
    
    if(!username) return false

    var idFile = {}

    PB.useSecureInfo(function(identities, currentUsername, privateRootKey, privateAdminKey, privateDefaultKey) {
        // this leaks all of the identity information back to the caller
        // if we passphrase protect the file, do it here to prevent that leakage

        var identity = identities[username]

        // assemble idFile manually to keep everything in the right order
        idFile.comment = "This file contains your private passphrase. It was generated at i.cx. The information here can be used to login to websites on the puffball.io platform. Keep this file safe and secure!"

        idFile.username = username
        // idFile.primary  = identity.primary // NOTE: primary is automatically gathered from aliases
        idFile.aliases  = identity.aliases
        idFile.preferences = identity.preferences
        idFile.version  = "1.1"
    })

    return idFile
}


/**
 * Get the current user's DHT record, or create a new anon user, or die trying
 * @return {string}
 */
PB.getUpToDateUserAtAnyCost = function() {
    //// Either get the current user's DHT record, or create a new anon user, or die trying

    var username = PB.getCurrentUsername()

    if(username)
        return PB.getUserRecordNoCache(username, 0) // 0 tells PB.Net.getUserRecord to fetch the latest
    
    var prom = PB.addNewAnonUser()
    
    return prom.then(function(userRecord) {
        PB.switchIdentityTo(userRecord.username)
        console.log("Setting current user to " + userRecord.username);
        return userRecord
    })
}


/**
 * Generate a random username
 * @return {string}
 */
PB.generateRandomUsername = function() {
    // TODO: consolidate this with the new username generation functions
    var generatedName = '';
    var alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for(var i=0; i<10; i++) {
        generatedName += PB.Crypto.getRandomItem(alphabet)
        // var randFloat = PB.Crypto.random();
        // generatedName = generatedName + alphabet[Math.floor(randFloat * (alphabet.length))];
    }
    return generatedName;
}


PB.addNewAnonUser = function(attachToUsername) {
    //// create a new anonymous alias. if attachToUsername is provided it becomes an alias for that identity.
    //// if attachToUsername is false the alias becomes primary for its own identity.

    // generate private keys
    var privateRootKey    = PB.Crypto.generatePrivateKey()
    var privateAdminKey   = PB.Crypto.generatePrivateKey()
    var privateDefaultKey = PB.Crypto.generatePrivateKey()
    
    // generate public keys
    var rootKey    = PB.Crypto.privateToPublic(privateRootKey)
    var adminKey   = PB.Crypto.privateToPublic(privateAdminKey)
    var defaultKey = PB.Crypto.privateToPublic(privateDefaultKey)

    // build new username
    var anonUsername = PB.generateRandomUsername()
    var newUsername  = 'anon.' + anonUsername

    // send it off
    var prom = PB.Net.registerSubuser('anon', CONFIG.users.anon.adminKey, newUsername, rootKey, adminKey, defaultKey)

    return prom
        .then(function(userRecord) {
            // store directly because we know they're valid, and so we don't get tangled up in more promises
            
            // FIXME: add to identity if attachToUsername
            
            // FIXME: otherwise add new identity
            // PB.addIdentity(newUsername, privateRootKey, privateAdminKey, privateDefaultKey)
            
            
            return userRecord
        },
        PB.promiseError('Anonymous user ' + anonUsername + ' could not be added'))
}



/// ERROR HELPERS

/**
 * on error function
 * @param  {string} msg 
 * @param  {object} obj 
 * @return {false}
 */
PB.onError = function(msg, obj) {
    //// override this for custom error behavior
    
    toSend = {msg: msg, obj: obj};

    if(puffworldprops.prefs.reporting)
        PB.Net.xhr(CONFIG.eventsApi, {method: 'POST'}, toSend)

    console.log(msg, obj) // adding this back in for debugging help
    return false
}

/**
 * promise error function
 * @param  {string} mes
 * @return {boolean}
 */
PB.promiseError = function(msg) {
    return function(err) {
        PB.onError(msg, err)
        throw err
    }
}

/**
 * throw error function
 * @param  {string} msg    
 * @param  {string} errmsg 
 * @return {boolean}
 */
PB.throwError = function(msg, errmsg) {
    throw PB.makeError(msg, errmsg)
}

PB.makeError = function(msg, errmsg) {
    var err = Error(errmsg || msg)
    PB.onError(msg, err)
    return err
}

/**
 * check if false promise
 * @param  {string} msg     
 * @return {boolean}     
 */
PB.emptyPromise = function(msg) {
    if(msg) PB.onError(msg)
    return Promise.reject(msg)
}

/**
 * check if the string is a valid JSON string
 * @param  {string} str 
 * @return {boolean}
 */
PB.parseJSON = function(str) {
    try {
        return JSON.parse(str)
    } catch(err) {
        return PB.onError('Invalid JSON string', err)
    }
}



// HELPERS

~function() {
    //// postpone until next tick
    // inspired by http://dbaron.org/log/20100309-faster-timeouts
    var later = []
    var messageName = 12345
    var gimme_a_tick = true

    function setImmediate(fun) {
        later.push(fun)
        
        if(gimme_a_tick) {
            gimme_a_tick = false
            window.postMessage(messageName, "*")
        }
        
        return false
    }

    function handleMessage(event) {
        if(event.data != messageName) return false

        event.stopPropagation()
        gimme_a_tick = true

        var now = later
        later = []

        for(var i=0, l=now.length; i < l; i++)
            now[i]()
    }
  
    if(typeof window != 'undefined') {
        window.addEventListener('message', handleMessage, true)
        window.setImmediate = setImmediate
    }
}()

PB.queuer = function() {
    //// do something after some other things
    var queue = []
    
    var nexttime = function(invoker) {
        invoker(function() {
            if(!queue.length) return false
            queue.shift()()
            nexttime(invoker)
        })
    }
            
    var queuer = function(invoker, fun) {
        queue.push(fun)
        if(queue.length > 1) return false // THINK: possible race condition
        nexttime(invoker) 
    }
    
    return queuer
}

PB.once = function() {
    //// do something later, but only once
    var later = []

    var step = function() {
        var now = later
        later = []
        for(var i=0, l=now.length; i < l; i++)
            now[i]()
    }
            
    var once = function(invoker, fun) {
        if(~later.indexOf(fun)) return false
        later.push(fun)
        if(later.length > 1) return false // THINK: possible race condition
        invoker(step) 
    }
    
    return once
}

~function() {
    if(typeof window != 'undefined') {
        window.queueImmediate = PB.queuer().bind(null, setImmediate)
        window.onceImmediate  = PB.once().bind(null, setImmediate)
        window.queueRAF = PB.queuer().bind(null, requestAnimationFrame)
        window.onceRAF  = PB.once().bind(null, requestAnimationFrame)
    
        var timefunbind = {}
        window.onceInAwhile = function(fun, time) {
            //// NOTE: don't use the same fun with different times
            if(timefunbind[fun]) return false
            timefunbind[fun] = setTimeout(function() {fun(); timefunbind[fun] = false}, time)
        }
    }
}()