/**
 * Resume encryption, run at build time. When the resume frontmatter sets password, the page holds no plaintext, only the encrypted ciphertext;
 * the browser-side decryption lives in src/views/resume/scripts/resume-vault.ts.
 *
 * Key = 128 bits derived with PBKDF2-SHA256(password, fixed salt, 600,000 iterations), then used for AES-GCM encryption.
 * Share links carry this key's base64url (22 characters), not the password:
 * anyone with the link can view the resume but cannot learn the password; the password is only used when typed on the lock screen.
 * The salt is fixed, so as long as the password is unchanged, the link stays the same on every rebuild; changing the password invalidates old links.
 * Both sides must use the same algorithm and parameters; changing one means changing the other.
 */

/** PBKDF2 iteration count, following OWASP's recommendation for PBKDF2-SHA256. Higher is harder to brute-force, but also slower to unlock with a typed password */
const KDF_ITERATIONS = 600_000;
/** Fixed salt, so the same password yields the same link token on every build */
const KDF_SALT = 'vergil:resume:link-key:v1';

export interface SealedData {
    salt: string;
    iter: number;
    iv: string;
    ciphertext: string;
}

const { subtle } = globalThis.crypto;
const encoder = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function toBase64(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64');
}

function deriveKey(password: string): Promise<CryptoKey> {
    let key = keyCache.get(password);
    if (!key) {
        key = subtle
            .importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
            .then((base) =>
                subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(KDF_SALT), iterations: KDF_ITERATIONS, hash: 'SHA-256' }, base, 128)
            )
            .then((bits) => subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt']));
        keyCache.set(password, key);
    }
    return key;
}

/** Encrypt a piece of HTML with a password, returning the ciphertext for the page and the parameters needed to derive the key from a typed password */
export async function seal(plaintext: string, password: string): Promise<SealedData> {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password);
    const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
    return {
        salt: KDF_SALT,
        iter: KDF_ITERATIONS,
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(ciphertext))
    };
}
