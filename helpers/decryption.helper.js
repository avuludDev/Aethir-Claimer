import CryptoJS from 'crypto-js';

const getDecryptedBytes = (_encBase64Pk, _pwd) => {
    const salt = CryptoJS.SHA256(_pwd);
    const key = CryptoJS.PBKDF2(_pwd, salt, { keySize: 256 / 32 });
    return CryptoJS.AES.decrypt(_encBase64Pk, key, { mode: CryptoJS.mode.ECB });
}

export const decryptPrivateKey = (_encBase64Pk, _pwd) => {
    const decryptedBytes = getDecryptedBytes(_encBase64Pk, _pwd);
    const decryptedHex = decryptedBytes.toString(CryptoJS.enc.Hex);
    if (decryptedHex[0] == decryptedHex[1] && decryptedHex[0] == 0) {
        const decrypt = decryptedHex.substring(0, 1) + 'x' + decryptedHex.substring(2);
        return decrypt;
    }
    return decryptedHex;
}