/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { endpointSchema } from '@japan-d2/schema-api-endpoint'
import { endpointFactory } from '../src'

import endpointSettings from './endpoint-settings'

const schema = endpointSchema({
  summary: 'test',
  description: 'this is test endpoint',
  request: {
    query: d => d.string('q'),
    body: d => d.string('b'),
    headers: d => d.string('h')
  },
  response: {
    body: d => d.string('b'),
    headers: d => d.string('h')
  }
})

const endpointBase = endpointFactory(endpointSettings)

describe('standard endpoint', () => {
  const endpoint = endpointBase.extend({
    callbacks: {
      onResult (_event, response) {
        response.headers = {
          ...response.headers,
          'Access-Control-Allow-Origin': '*'
        }
      }
    }
  })

  const handler = endpoint(schema, async (event, context) => {
    return context.createResponse({
      body: {
        b: JSON.stringify({
          ...event.body,
          ...event.headers,
          ...event.query
        })
      },
      headers: {
        h: 'response header'
      }
    })
  })

  it('should be succeeded when pass the valid request', async () => {
    const context = {
      awsRequestId: 'aws-request-id'
    } as Context

    const response = await handler({
      queryStringParameters: {
        q: 'q'
      },
      body: JSON.stringify({
        b: 'b'
      }),
      headers: {
        h: 'h'
      }
    } as unknown as APIGatewayProxyEvent, context)

    expect(response.statusCode).toBe(200)
    expect(response.headers).toHaveProperty('Access-Control-Allow-Origin')
    expect(JSON.parse(JSON.parse(response.body).b)).toStrictEqual({
      b: 'b',
      h: 'h',
      q: 'q'
    })
  })

  it('should be failed when pass the invalid request', async () => {
    const context = {
      awsRequestId: 'aws-request-id'
    } as Context

    const response = await handler({
      queryStringParameters: {
        q: 'q'
      },
      body: JSON.stringify({
        b: 0
      }),
      headers: {
        h: 'h'
      }
    } as unknown as APIGatewayProxyEvent, context)

    expect(response.statusCode).toBe(400)
    expect(response.headers).toHaveProperty('Access-Control-Allow-Origin')
    expect(JSON.parse(response.body)).toStrictEqual({
      error: {
        property: 'instance.body.b',
        message: 'is not of a type(s) string',
        schema: {
          type: 'string'
        },
        name: 'type',
        argument: [
          'string'
        ],
        stack: 'instance.body.b is not of a type(s) string'
      }
    })
  })
})

describe('endpoint with custom error handler', () => {
  const endpoint = endpointBase.extend({
    callbacks: {
      onResult (_event, response) {
        response.headers = {
          ...response.headers,
          'Access-Control-Allow-Origin': '*'
        }
      },
      onHandledError (_event, error) {
        return {
          statusCode: 200,
          headers: {},
          body: JSON.stringify({
            error
          })
        }
      }
    }
  })

  const handler = endpoint(schema, async (event, context) => {
    return context.createResponse({
      body: {
        b: JSON.stringify({
          ...event.body,
          ...event.headers,
          ...event.query
        })
      },
      headers: {
        h: 'response header'
      }
    })
  })

  it('should be succeeded when pass the invalid request', async () => {
    const context = {
      awsRequestId: 'aws-request-id'
    } as Context

    const response = await handler({
      queryStringParameters: {
        q: 'q'
      },
      body: JSON.stringify({
        b: 0
      }),
      headers: {
        h: 'h'
      }
    } as unknown as APIGatewayProxyEvent, context)

    expect(response.statusCode).toBe(200)
    expect(response.headers).toHaveProperty('Access-Control-Allow-Origin')
    expect(JSON.parse(response.body)).toStrictEqual({
      error: {
        property: 'instance.body.b',
        message: 'is not of a type(s) string',
        schema: {
          type: 'string'
        },
        name: 'type',
        argument: [
          'string'
        ],
        stack: 'instance.body.b is not of a type(s) string'
      }
    })
  })
})

describe('handle error in custom error handler', () => {
  const endpoint = endpointBase.extend({
    callbacks: {
      onResult (_event, response) {
        response.headers = {
          ...response.headers,
          'Access-Control-Allow-Origin': '*'
        }
      },
      onUnhandledError (_event, error) {
        if (error instanceof Error) {
          return {
            statusCode: 400,
            headers: {},
            body: JSON.stringify({
              error: error.message
            })
          }
        }
        return {
          statusCode: 500,
          headers: {},
          body: '{}'
        }
      },
      onEvent () {
        throw new Error('Error at onEvent!')
      }
    }
  })

  const handler = endpoint(schema, async (event, context) => {
    return context.createResponse({
      body: {
        b: JSON.stringify({
          ...event.body,
          ...event.headers,
          ...event.query
        })
      },
      headers: {
        h: 'response header'
      }
    })
  })

  it('should be catch in onUnhandledError', async () => {
    const context = {
      awsRequestId: 'aws-request-id'
    } as Context

    const response = await handler({
      queryStringParameters: {
        q: 'q'
      },
      body: JSON.stringify({
        b: 0
      }),
      headers: {
        h: 'h'
      }
    } as unknown as APIGatewayProxyEvent, context)

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toStrictEqual({
      error: 'Error at onEvent!'
    })
  })

  it('should be pass to the onResult', async () => {
    const context = {
      awsRequestId: 'aws-request-id'
    } as Context

    const response = await handler({
      queryStringParameters: {
        q: 'q'
      },
      body: JSON.stringify({
        b: 0
      }),
      headers: {
        h: 'h'
      }
    } as unknown as APIGatewayProxyEvent, context)

    expect(response.headers).toHaveProperty('Access-Control-Allow-Origin')
  })
})
