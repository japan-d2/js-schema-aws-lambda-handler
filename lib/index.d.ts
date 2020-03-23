import { Dirty, Pure } from '@japan-d2/schema';
import { SchemaDefinition } from '@japan-d2/schema/lib/interfaces';
import { EndpointSchema } from '@japan-d2/schema-api-endpoint';
import { ValidationError } from 'jsonschema';
import { Context } from 'aws-lambda';
export declare type CustomContext<ResultInner, ResultOuter> = Context & {
    createResponse(input: ResultInner): ResultOuter;
};
export declare type InnerHandler<EventInner, ResultInner, ResultOuter> = (event: EventInner, context: CustomContext<ResultInner, ResultOuter>) => Promise<ResultOuter>;
declare type PureInnerHandler<EventSchema, ResultInner, EventInner, ResultOuter> = InnerHandler<EventInner & Pure<SchemaDefinition<EventSchema>>, ResultInner, ResultOuter>;
declare type DirtyInnerHandler<EventSchema, ResultInner, EventInner, ResultOuter> = InnerHandler<EventInner & Dirty<SchemaDefinition<EventSchema>>, ResultInner, ResultOuter>;
declare type OutsideHandler<EventOuter, ResultOuter> = (event: EventOuter, context: Context) => Promise<ResultOuter>;
declare type Callbacks<EventInner, ResultOuter> = {
    onEvent?: (event: EventInner, context: Context, schema: EndpointSchema<unknown, unknown>) => void;
    onResult?: (event: EventInner, response: ResultOuter, schema: EndpointSchema<unknown, unknown>) => void;
    onUnhandledError?: (event: EventInner, error: unknown, schema: EndpointSchema<unknown, unknown>) => ResultOuter | Promise<ResultOuter>;
    onHandledError?: (event: EventInner, error: ValidationError, schema: EndpointSchema<unknown, unknown>) => undefined | ResultOuter | Promise<ResultOuter>;
};
declare type FactorySettings<EventOuter, EventInner, ResultOuter> = {
    eventModifier: (input: EventOuter) => EventInner;
    resultBuilder: (input: any) => ResultOuter;
    errorResultBuilder: (error: ValidationError) => ResultOuter;
};
declare type Settings<EventInner, ResultOuter> = {
    callbacks: Callbacks<EventInner, ResultOuter>;
};
declare type Options<EventInner, ResultOuter> = Partial<Settings<EventInner, ResultOuter>>;
declare type EndpointReturns<EventOuter, ResultOuter> = OutsideHandler<EventOuter, ResultOuter>;
interface Endpoint<EventOuter = {}, EventInner = {}, ResultOuter = {}, O = Options<EventInner, ResultOuter>> {
    <EventSchema, ResultInner>(schema: EndpointSchema<EventSchema, ResultInner>, handler: PureInnerHandler<EventSchema, ResultInner, EventInner, ResultOuter>): EndpointReturns<EventOuter, ResultOuter>;
    <EventSchema, ResultInner>(schema: EndpointSchema<EventSchema, ResultInner>, options: O & {
        validate: false;
    }, handler: DirtyInnerHandler<EventSchema, ResultInner, EventInner, ResultOuter>): EndpointReturns<EventOuter, ResultOuter>;
    <EventSchema, ResultInner>(schema: EndpointSchema<EventSchema, ResultInner>, options: O, handler: PureInnerHandler<EventSchema, ResultInner, EventInner, ResultOuter>): EndpointReturns<EventOuter, ResultOuter>;
    defaultSettings: Partial<Settings<EventInner, ResultOuter>>;
    extend<F extends EventInner>(defaultSettings?: Partial<Settings<F, ResultOuter>>): Endpoint<EventOuter, F, ResultOuter, O>;
}
export declare function endpointFactory<EventOuter, EventInner, ResultOuter>(settings: FactorySettings<EventOuter, EventInner, ResultOuter>, defaultSettings?: Partial<Settings<EventInner, ResultOuter>>): Endpoint<EventOuter, EventInner, ResultOuter>;
export {};
