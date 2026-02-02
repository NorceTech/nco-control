/**
 * Default templates for ncoctl init
 */

/**
 * Default ncoctl.config.yaml template
 */
export function getConfigTemplate(merchant: string): string {
  return `# nco-control configuration
# See: https://github.com/NorceTech/nco-control

# Required: Merchant identifier
merchant: ${merchant}

# Required: Configuration API settings
api:
  # API base URL
  baseUrl: https://checkout-configuration.example.com
  # Bearer token (can use NCOCTL_API_TOKEN env var)
  # token: "\${NCOCTL_API_TOKEN}"

# Optional: Schema validation settings
schema:
  # Cache directory for JSON schemas (default: .ncoctl/schemas)
  # cacheDir: .ncoctl/schemas
  # Cache TTL in seconds (default: 86400 = 24 hours)
  # cacheTtl: 86400
  # Skip schema validation (default: false)
  # skip: false

# Optional: Output settings
output:
  # Default output format: "text" or "json" (default: text)
  # format: text
  # Verbose output (default: false)
  # verbose: false
`;
}

/**
 * Default .env.example template
 */
export const ENV_EXAMPLE_TEMPLATE = `# Environment variables for nco-control
# Copy this file to .env and fill in your values

# API token for Configuration API (required for plan/apply)
NCOCTL_API_TOKEN=your-api-token-here

# Add your secret values here to be substituted in configs
# MY_SECRET_KEY=secret-value
# ANOTHER_SECRET=another-value
`;

/**
 * Default .gitignore entries
 */
export const GITIGNORE_ENTRIES = `
# nco-control
.env
.env.*
!.env.example
.ncoctl/
`;

/**
 * Example channel config
 */
export function getExampleChannelConfig(channelName: string): string {
  return `# Example configuration for ${channelName}
# Replace with your actual configuration

$schema: https://checkout-configuration.example.com/schemas/example.json
id: example-config

# Your configuration fields here
# field1: value1
# field2: \${MY_SECRET_KEY}
`;
}
