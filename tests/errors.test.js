import { describe, expect, test } from '@jest/globals'

import { TransakApiError } from '../src/errors.js'

describe('TransakApiError', () => {
  test('should set the message and name', () => {
    const error = new TransakApiError('Failed to fetch Transak quote: 400 Bad Request')

    expect(error.message).toBe('Failed to fetch Transak quote: 400 Bad Request')
    expect(error.name).toBe('TransakApiError')
  })

  test('should be an instance of Error', () => {
    const error = new TransakApiError('Failed to fetch Transak quote: 400 Bad Request')

    expect(error).toBeInstanceOf(Error)
  })
})
