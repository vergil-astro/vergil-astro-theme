/**
 * 简历加密，构建时运行。简历 frontmatter 写了 password 时，页面里不放明文，只放加密后的密文，
 * 浏览器解开的逻辑在 src/views/resume/scripts/resume-vault.ts。
 *
 * 密钥 = PBKDF2-SHA256(密码, 固定盐, 60 万次) 派生出的 128 位，再用 AES-GCM 加密。
 * 分享链接里放的是这个密钥的 base64url（22 个字符），不是密码：
 * 拿到链接能直接看，但看不出密码；密码只在锁屏上手动输入时用。
 * 盐是固定的，所以只要密码不变，每次重新构建链接都不变；换了密码，旧链接就失效。
 * 两边的算法和参数必须一致，改一边要同时改另一边。
 */

/** PBKDF2 迭代次数，按 OWASP 对 PBKDF2-SHA256 的建议取值。越大越难暴力猜，手动输入密码解锁也越慢 */
const KDF_ITERATIONS = 600_000;
/** 固定的盐，保证同一个密码每次构建得到同一个链接口令 */
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

/** 用密码加密一段 HTML，返回放进页面的密文和手动输入密码时派生密钥需要的参数 */
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
