import { field } from '@japan-d2/schema'
import { defaultKeyNameMap, endpointSchemaFactoryV2 } from '@japan-d2/schema-api-endpoint'

export const endpointV2 = endpointSchemaFactoryV2({
  keyNameMap: {
    ...defaultKeyNameMap,
    request: {
      ...defaultKeyNameMap.request,
      query: 'queryStringParameters'
    }
  }
})

/* eslint-disable @typescript-eslint/naming-convention */
const assetCatalogObjectTypeSchema = {
  m_AssemblyName: field.string(),
  m_ClassName: field.string()
} as const

const assetCatalogProviderDataSchema = {
  m_Id: field.string(),
  m_ObjectType: field.object(assetCatalogObjectTypeSchema, {}),
  m_Data: field.string()
} as const

const assetCatalogSchema = {
  m_LocatorId: field.string(),
  m_InstanceProviderData: field.object(assetCatalogProviderDataSchema, {}),
  m_SceneProviderData: field.object(assetCatalogProviderDataSchema, {}),
  m_ResourceProviderData: field.array('object', assetCatalogProviderDataSchema, {}),
  m_ProviderIds: field.array('string'),
  m_InternalIds: field.array('string'),
  m_KeyDataString: field.string(),
  m_BucketDataString: field.string(),
  m_EntryDataString: field.string(),
  m_ExtraDataString: field.string(),
  m_resourceTypes: field.array('object', assetCatalogObjectTypeSchema, {})
} as const
/* eslint-enable @typescript-eslint/naming-convention */

export const unityAddressableCatalogSchema = {
  publishContents: endpointV2({
    request: {
      body: field.object({
        tenantId: field.integer(),
        venueId: field.integer(),
        eventId: field.integer(),
        catalog: field.object({
          ios: field.object(assetCatalogSchema, {}, {
            additionalProperties: true
          }),
          win64: field.object(assetCatalogSchema, {}, {
            additionalProperties: true
          })
        }, {
        })
      })
    },
    response: {
      body: field.object({
        ok: field.enum('integer', [1])
      })
    }
  })
}
