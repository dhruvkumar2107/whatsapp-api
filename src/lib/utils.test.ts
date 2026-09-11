import { describe, it, expect } from 'vitest'
import {
  cn,
  formatPhoneNumber,
  slugify,
  capitalize,
  generateApiKey,
  hashApiKey,
} from '@/lib/utils'
import { API_KEY_PREFIX } from '@/lib/constants'

describe('formatPhoneNumber', () => {
  it('adds a + prefix when missing', () => {
    expect(formatPhoneNumber('15551234567')).toBe('+15551234567')
  })

  it('keeps the + prefix for US 11-digit numbers', () => {
    expect(formatPhoneNumber('+15551234567')).toBe('+15551234567')
  })

  it('strips non-digit characters', () => {
    expect(formatPhoneNumber('+1 (555) 123-4567')).toBe('+15551234567')
  })

  it('adds + to international numbers', () => {
    expect(formatPhoneNumber('919876543210')).toBe('+919876543210')
  })
})

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Demo Workspace')).toBe('demo-workspace')
  })

  it('removes special characters', () => {
    expect(slugify('Café & Co!')).toBe('caf-co')
  })

  it('collapses multiple separators', () => {
    expect(slugify('  Hello   World  ')).toBe('hello-world')
  })

  it('trims leading/trailing dashes', () => {
    expect(slugify('-foo-')).toBe('foo')
  })
})

describe('capitalize', () => {
  it('capitalizes the first letter', () => {
    expect(capitalize('marketing')).toBe('Marketing')
  })

  it('lowercases the rest', () => {
    expect(capitalize('MARKETING')).toBe('Marketing')
  })
})

describe('generateApiKey', () => {
  it('prefixes the key', () => {
    const { key } = generateApiKey()
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true)
  })

  it('generates a matching hash', () => {
    const { key, hashed } = generateApiKey()
    expect(hashApiKey(key)).toBe(hashed)
  })

  it('generates unique keys', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.key).not.toBe(b.key)
  })
})

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'px-3')).toBe('px-3')
  })

  it('filters falsy values', () => {
    expect(cn('a', null, undefined, false, 'b')).toBe('a b')
  })
})