import { Dirty, Pure, assertValid } from '@japan-d2/schema'
import { SchemaDefinition } from '@japan-d2/schema/lib/interfaces'
import { EndpointSchema } from '@japan-d2/schema-api-endpoint'
import { ValidationError } from 'jsonschema'

// eslint-disable-next-line node/no-extraneous-import
import { Context } from 'aws-lambda'

export type CustomContext<ResultInner, ResultOuter> = Context & {
  createResponse (input: ResultInner): ResultOuter;
}

export type InnerHandler<EventInner, ResultInner, ResultOuter> = (
  event: EventInner,
  context: CustomContext<ResultInner, ResultOuter>,
) => Promise<ResultOuter>;

type PureInnerHandler<EventSchema, ResultInner, EventInner, ResultOuter> = InnerHandler<
  EventInner & Pure<SchemaDefinition<EventSchema>>,
  ResultInner,
  ResultOuter
>

type DirtyInnerHandler<EventSchema, ResultInner, EventInner, ResultOuter> = InnerHandler<
  EventInner & Dirty<SchemaDefinition<EventSchema>>,
  ResultInner,
  ResultOuter
>

type OutsideHandler<EventOuter, ResultOuter> = (event: EventOuter, context: Context) => Promise<ResultOuter>;

type Callbacks <EventInner, ResultOuter> = {
  onEvent?: (event: EventInner, context: Context, schema: EndpointSchema<unknown, unknown>) => void;
  onResult?: (event: EventInner, response: ResultOuter, schema: EndpointSchema<unknown, unknown>) => void;
  onUnhandledError?: (event: EventInner, error: unknown, schema: EndpointSchema<unknown, unknown>) => ResultOuter | Promise<ResultOuter>;
  onHandledError?: (event: EventInner, error: ValidationError, schema: EndpointSchema<unknown, unknown>) => undefined | ResultOuter | Promise<ResultOuter>;
}

type FactorySettings <EventOuter, EventInner, ResultOuter> = {
  eventModifier: (input: EventOuter) => EventInner;
  resultBuilder: (input: any) => ResultOuter;
  errorResultBuilder: (error: ValidationError) => ResultOuter;
}

type Settings <EventInner, ResultOuter> = {
  callbacks: Callbacks<EventInner, ResultOuter>;
}

type Options <EventInner, ResultOuter> = Partial<Settings<EventInner, ResultOuter>>

type EndpointReturns <EventOuter, ResultOuter> = OutsideHandler<EventOuter, ResultOuter>

interface Endpoint <
  EventOuter = {},
  EventInner = {},
  ResultOuter = {},
  O = Options<EventInner, ResultOuter>
> {
  <EventSchema, ResultInner> (
    schema: EndpointSchema<EventSchema, ResultInner>,
    handler: PureInnerHandler<EventSchema, ResultInner, EventInner, ResultOuter>
  ): EndpointReturns<EventOuter, ResultOuter>;

  <EventSchema, ResultInner> (
    schema: EndpointSchema<EventSchema, ResultInner>,
    options: O & { validate: false },
    handler: DirtyInnerHandler<EventSchema, ResultInner, EventInner, ResultOuter>
  ): EndpointReturns<EventOuter, ResultOuter>;

  <EventSchema, ResultInner> (
    schema: EndpointSchema<EventSchema, ResultInner>,
    options: O,
    handler: PureInnerHandler<EventSchema, ResultInner, EventInner, ResultOuter>
  ): EndpointReturns<EventOuter, ResultOuter>;

  defaultSettings: Partial<Settings<EventInner, ResultOuter>>;

  extend <F> (
    defaultSettings?: Partial<Settings<EventInner & F, ResultOuter>>
  ): Endpoint<EventOuter, EventInner & F, ResultOuter, O>;
}

export function endpointFactory <EventOuter, EventInner, ResultOuter> (
  settings: FactorySettings<EventOuter, EventInner, ResultOuter>,
  defaultSettings?: Partial<Settings<EventInner, ResultOuter>>
): Endpoint <EventOuter, EventInner, ResultOuter> {
  const endpointInternal = (...args: unknown[]): OutsideHandler<EventOuter, ResultOuter> => {
    const schema = args.shift() as EndpointSchema<unknown, unknown>

    const options = {
      ...(defaultSettings || {}),
      ...(args.length === 2 ? (args.shift() as {}) : {})
    } as Settings<EventInner, ResultOuter> & { validate?: false }

    const { callbacks } = options
    const validate = options.validate !== false

    const trapResult = async (
      event: EventInner,
      handler: () => Promise<ResultOuter>
    ): Promise<ResultOuter> => {
      try {
        const result = await handler()

        if (callbacks.onResult) {
          callbacks.onResult(event, result, schema)
        }

        return result
      } catch (error) {
        if (callbacks.onUnhandledError) {
          return callbacks.onUnhandledError(event, error, schema)
        } else {
          throw error
        }
      }
    }

    const insideHandler = args.shift() as DirtyInnerHandler<EventInner, unknown, unknown, ResultOuter>
    const outsideHandler: OutsideHandler<EventOuter, ResultOuter> = async (rawEvent, rawContext): Promise<ResultOuter> => {
      const event = settings.eventModifier(rawEvent)

      if (callbacks.onEvent) {
        callbacks.onEvent(event, rawContext, schema)
      }

      const context: CustomContext<{}, ResultOuter> = {
        ...rawContext,
        createResponse: settings.resultBuilder
      }

      if (validate === false) {
        return trapResult(event, () => insideHandler(event, context))
      }

      try {
        assertValid(event, schema.request)
      } catch (error) {
        const customHandledError = await callbacks.onHandledError?.(event, error, schema)
        const errorResponse = customHandledError ?? settings.errorResultBuilder(error)

        if (callbacks.onResult) {
          callbacks.onResult(event, errorResponse, schema)
        }

        return Promise.resolve(errorResponse)
      }

      return trapResult(event, () => insideHandler(event, context))
    }

    return outsideHandler
  }

  return Object.assign(endpointInternal as any, {
    extend (newDefaultSettings: any): unknown {
      return endpointFactory(settings, {
        ...defaultSettings,
        ...newDefaultSettings,
        callbacks: {
          ...defaultSettings?.callbacks,
          ...newDefaultSettings?.callbacks
        }
      })
    }
  })
}
