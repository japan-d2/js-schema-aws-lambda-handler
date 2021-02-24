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
  query: Record<string, string | undefined>;
}

function eventModifier (event: InputType): Omit<InputType, 'body'> & ParameterType {
  return {
    ...event,
    body: JSON.parse(event.body || '{}'),
    query: event.queryStringParameters || {}
  }
}

function resultBuilder (input: ResultInputType): ResultType {
  return {
    statusCode: 200,
    body: JSON.stringify(input.body || {}),
    headers: input.headers || {}
  }
}

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
