# schema-aws-lambda-handler

fully-typesafe AWS Lambda handler definition and specification with automatic request validation based on @japan-d2/schema-api-endpoint

# install

```bash
npm install @japan-d2/schema-aws-lambda-handler
```

or

```bash
yarn add @japan-d2/schema-aws-lambda-handler
```

# usage

## build your settings

Define 3 functions that meet your needs.

[sample (endpoint-settings.ts)](tests/endpoint-settings.ts)

```endpoint-settings.ts
// endpoint-settings.ts

import { APIGatewayProxyEvent } from 'aws-lambda'
import { ValidationError } from 'jsonschema'

type InputType = APIGatewayProxyEvent

type ResultType = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

type ResultInputType = {
  body?: unknown;
  headers?: Record<string, string>;
}

type ParameterType = {
  body: unknown;
  query: Record<string, string>;
}

// the `eventModifier` modifies incoming events.
// In the following example, the `body` given as a string is parsed and overwritten.
// Also, the `queryStringParameters` is aliased to the `query` and given an default value.
// Remember to specify the fully return type to give more hints to the factory function.
function eventModifier (event: InputType): Omit<InputType, 'body'> & ParameterType {
  return {
    ...event,
    body: JSON.parse(event.body || '{}'),
    query: event.queryStringParameters || {}
  }
}

// the `resultBuilder` converts the designed response parameters into parameters that affect the real world in the case of successful processing.
// Remember to specify the fully return type to give more hints to the factory function.
function resultBuilder (input: ResultInputType): ResultType {
  return {
    statusCode: 200,
    body: JSON.stringify(input.body || {}),
    headers: input.headers || {}
  }
}

// the `errorResultBuilder` is the same as resultBuilder in case of process failure.
// The return type must be exactly the same as `resultBuilder`.
function errorResultBuilder (error: ValidationError): ResultType {
  return {
    statusCode: 400,
    body: JSON.stringify({ error }),
    headers: {}
  }
}

export default {
  resultBuilder,
  errorResultBuilder,
  eventModifier
}
```

## create new endpoint function

```endpoint.ts
// endpoint.ts
import { endpointFactory } from '@japan-d2/schema-aws-lambda-handler'
import endpointSettings from './endpoint-settings'

export const endpoint = endpointFactory(endpointSettings)
```

## define new endpoint

1. endpoint schema base definition

```endpoints/schema/base.ts
// endpoints/schema/base.ts
import { endpointSchemaFactory, defaultKeyNameMap } from '@japan-d2/schema-api-endpoint'

export const endpoint = endpointSchemaFactory({
  keyNameMap: {
    ...defaultKeyNameMap,
    request: {
      ...defaultKeyNameMap.request,
      query: 'queryStringParameters',
    },
  },
})
```

2. schema definition

```endpoints/schema/createUser.ts
// endpoints/schema/createUser.ts
import { endpoint } from './base'

export const schema = {
  createUser: endpoint({
    summary: 'create new user',
    request: {
      body: d => d.string('email', {
        description: 'email address',
        format: 'email',
      }),
    },
    response: {
      body: d => d.string('id'),
    },
  }),
}
```

3. implement handler

```endpoints/createUser.ts
// endpoints/createUser.ts
import { endpoint } from '../endpoint'
import { schema } from './schema/createUser'
import api from 'path/to/api'

export const createUser = endpoint(schema, async (event, context) => {
  const id = (await api.createUser({ email: event.body.email }))
  return context.createResponse({
    body: {
      id,
    }
  })
})
```

4. (Optional) handler without request auto validation

```endpoints/createUser.ts
// endpoints/createUser.ts
import { assertValid } from '@japan-d2/schema'
import { endpoint } from '../endpoint'
import { schema } from './schema/createUser'
import api from 'path/to/api'

export const createUser = endpoint(schema, { validate: false }, async (event, context) => {
  // event: { body: unknown }

  // validation with TypeScript's asserts guard.
  assertValid(event, schema.request)

  // or, manual validation
  if (
    'body' in event &&
    typeof event.body === 'object' &&
    'email' in event.body &&
    typeof event.body.email !== 'string'
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'invalid email',
      })
    }
  }

  const id = (await api.createUser({ email }))
  return context.createResponse({
    body: {
      id,
    }
  })
})
```

# license

MIT
