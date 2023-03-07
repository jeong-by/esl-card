const crypto = require('crypto');

const _key = require('../../openssl/key');
let _iv = crypto.randomBytes(16);   
class EnCryption {
    
    requestParseKey () {
        
        return _key
    }
    requestIv () {
        return _iv
    }

    async decrypt(saltCiphertextB64) {
        // Separate salt and ciphertext
        // Received from client
        var saltCiphertextBuf = Buffer.from(saltCiphertextB64, 'base64');
        var saltBuf = saltCiphertextBuf.slice(0,16);
        var ciphertextBuf = saltCiphertextBuf.slice(16);

        // Derive key and IV via PBKDF2
        var keyIVBuf = crypto.pbkdf2Sync(_key, saltBuf, 1000, 32 + 16, 'sha256');
        var keyBuf = keyIVBuf.slice(0, 32); 
        var ivBuf = keyIVBuf.slice(32, 32 + 16);

        // Decrypt
        var decipher = crypto.createDecipheriv("aes-256-cbc", keyBuf, ivBuf);
        var plaintextBuf = Buffer.concat([decipher.update(ciphertextBuf), decipher.final()]);

        return plaintextBuf.toString('utf8')
    }
}

module.exports = EnCryption;
