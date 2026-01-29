# Configuration API

The Configuration API is the backend service that stores and retrieves Norce Checkout configurations.

## Base URL

Norce APIs follow this URL structure:

```
https://{slug}.{lb}.{env}.norce.tech/{area}/{service}/{path}
```

| Component | Description | Example |
|-----------|-------------|---------|
| `slug` | Merchant identifier (usually same as merchant name) | `acme-partner` |
| `lb` | Load balancer region | `api-se` |
| `env` | Environment | `playground`, `stage`, or omitted for production |
| `area` | Product area | `checkout`, `commerce`, `core` |
| `service` | Service name | `configuration` |
| `path` | Service-specific path | `api/v1/configuration/...` |

**Example:**
```
https://acme-partner.api-se.playground.norce.tech/checkout/configuration/api/v1/configuration/merchants/acme-partner/channels/default/configurations
```

## Authentication

All endpoints require Bearer token authentication via the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Endpoints

### List Channels

```
GET /api/v1/configuration/merchants/{merchant}/channels
```

Returns an array of channel name strings.

**Example Response:**
```json
["store-se-klarna", "store-se-walley", "store-fi-adyen"]
```

### List Configurations for Channel

```
GET /api/v1/configuration/merchants/{merchant}/channels/{channel}/configurations
```

Returns an array of configuration objects for a channel.

### Get Single Configuration

```
GET /api/v1/configuration/merchants/{merchant}/channels/{channel}/configurations/{configuration_name}
```

Returns a single configuration object.

### Create/Update Configuration

```
PUT /api/v1/configuration/merchants/{merchant}/channels/{channel}/configurations/{configuration_name}
```

Creates or updates a configuration. Creates the channel if it doesn't exist.

**Request Body:** Configuration object with required `$schema` and `id` fields.

### Delete Configuration

```
DELETE /api/v1/configuration/merchants/{merchant}/channels/{channel}/configurations/{configuration_name}
```

Removes a configuration. Deletes the channel if this was the last configuration.

### Bulk Update Configurations

```
PUT /api/v1/configuration/merchants/{merchant}/channels/{channel}/configurations
```

Sets multiple configurations at once. Only affects the configurations provided in the request body.

### Delete All Channel Configurations

```
DELETE /api/v1/configuration/merchants/{merchant}/channels/{channel}/configurations
```

Removes all configurations and the channel itself.

## Configuration Object Structure

Every configuration object must have:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | Yes | URL to the JSON schema for validation |
| `id` | string | Yes | Identifier for the adapter/service |
| (other) | any | No | Additional properties specific to the configuration type |

**Example configuration:**
```json
{
  "$schema": "https://example.norce.tech/schemas/norce_adapter.json",
  "id": "norce_adapter",
  "active": true,
  "settings": {
    "applicationId": "12345",
    "marketId": "1"
  }
}
```

## Configuration Types

### Platform

| Configuration ID | Purpose |
|-----------------|---------|
| `norce_adapter` | Norce Commerce integration settings |

### Payment Service Providers

| Configuration ID | Provider |
|-----------------|----------|
| `klarna_checkout_adapter` | Klarna Checkout |
| `klarna_payments_adapter` | Klarna Payments |
| `walley_checkout_adapter` | Walley |
| `qliro_adapter` | Qliro One |
| `adyen_adapter` | Adyen Drop-in |
| `paypal_adapter` | PayPal |
| `svea_adapter` | Svea |
| `avarda_adapter` | Avarda |
| `nonpsp_adapter` | Non-PSP (invoice, in-store) |
| `awardit_adapter` | Awardit gift cards/vouchers |

### Shipping/Delivery Service Providers

| Configuration ID | Purpose |
|-----------------|---------|
| `ingrid_adapter` | Ingrid shipping |
| `nshift_adapter` | nShift shipping |

### Checkout / Admin configurations

| Configuration ID | Purpose |
|-----------------|---------|
| `checkout_application` | General checkout settings |
| `checkout_layout_order` | Layout structure for checkout page |
| `checkout_layout_confirmation` | Layout structure for confirmation page |

## Schema Validation

Each configuration type has its own JSON schema, referenced by the `$schema` field. Schemas are served by the respective adapter services and used to validate configurations before they are applied.

## Secrets

The following fields typically contain secrets and should be stored in `.env` files rather than committed to version control:

- `norce_adapter.api.identityClientSecret`
- PSP adapter API credentials (`apiSecret`, `password`, `apiKey`, etc.)
- `ingrid_adapter.apiSettings.apiKey`
- `awardit_adapter.apiSettings.password`
