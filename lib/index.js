"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@japan-d2/schema");
function endpointFactory(settings, defaultSettings) {
    const endpointInternal = (...args) => {
        const schema = args.shift();
        const options = Object.assign(Object.assign({}, (defaultSettings || {})), (args.length === 2 ? args.shift() : {}));
        const { callbacks } = options;
        const validate = options.validate !== false;
        const trapResult = (event, handler) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield handler();
                if (callbacks.onResult) {
                    callbacks.onResult(event, result, schema);
                }
                return result;
            }
            catch (error) {
                if (callbacks.onUnhandledError) {
                    return callbacks.onUnhandledError(event, error, schema);
                }
                else {
                    throw error;
                }
            }
        });
        const insideHandler = args.shift();
        const outsideHandler = (rawEvent, rawContext) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const event = settings.eventModifier(rawEvent);
            if (callbacks.onEvent) {
                callbacks.onEvent(event, rawContext, schema);
            }
            const context = Object.assign(Object.assign({}, rawContext), { createResponse: settings.resultBuilder });
            if (validate === false) {
                return trapResult(event, () => insideHandler(event, context));
            }
            try {
                schema_1.assertValid(event, schema.request);
            }
            catch (error) {
                const customHandledError = yield ((_b = (_a = callbacks).onHandledError) === null || _b === void 0 ? void 0 : _b.call(_a, event, error, schema));
                const errorResponse = (customHandledError !== null && customHandledError !== void 0 ? customHandledError : settings.errorResultBuilder(error));
                if (callbacks.onResult) {
                    callbacks.onResult(event, errorResponse, schema);
                }
                return Promise.resolve(errorResponse);
            }
            return trapResult(event, () => insideHandler(event, context));
        });
        return outsideHandler;
    };
    return Object.assign(endpointInternal, {
        extend(newDefaultSettings) {
            var _a, _b;
            return endpointFactory(settings, Object.assign(Object.assign(Object.assign({}, defaultSettings), newDefaultSettings), { callbacks: Object.assign(Object.assign({}, (_a = defaultSettings) === null || _a === void 0 ? void 0 : _a.callbacks), (_b = newDefaultSettings) === null || _b === void 0 ? void 0 : _b.callbacks) }));
        }
    });
}
exports.endpointFactory = endpointFactory;
