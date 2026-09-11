import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encrypt, decrypt, hashString, generateRandomToken } from '@/lib/encryption'

const ENCRYPTION_KEY = 'a'.repeat(32)

describe('encrypt/decrypt', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = ENCRYPTION_KEY
  })

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY
  })

  it('round-trips plaintext', () => {
    const cipher = encrypt('super-secret-token')
    expect(decrypt(cipher)).toBe('super-secret-token')
  })

  it('handles unicode strings', () => {
    const cipher = encrypt('हिन्दी + 日本語 + emoji 🚀')
    expect(decrypt(cipher)).toBe('हिन्दी + 日本語 + emoji 🚀')
  })

  it('produces unique ciphertext for the same input', () => {
    expect(encrypt('same')).not.toBe(encrypt('same'))
  })

  it('throws on malformed ciphertext', () => {
    expect(() => decrypt('not:valid:format:extra')).toThrow('Invalid encrypted text format')
  })

  it('throws when tampered', () => {
    const cipher = encrypt('secret')
    const parts = cipher.split(':')
    const tampered = Buffer.from('ffffffffffffffffffffffffffffffff', 'hex').toString('hex')
    parts[1] = tampered
    expect(() => decrypt(parts.join(':'))).toThrow()
  })

  it('throws when key is missing', () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encrypt('x')).toThrow('ENCRYPTION_KEY')
  })
})

describe('hashString', () => {
  it('produces a 64-char sha256 hex digest', () => {
    expect(hashString('hello')).toMatch(/^[a-f0-9]{64}$/)
  })

  it('is deterministic', () => {
    expect(hashString('hello')).toBe(hashString('hello'))
  })

  it('differs for different inputs', () => {
    expect(hashString('hello')).not.toBe(hashString('world'))
  })
})

describe('generateRandomToken', () => {
  it('generates unique tokens', () => {
    expect(generateRandomToken(32)).not.toBe(generateRandomToken(32))
  })
})