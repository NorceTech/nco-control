# Sample Project: acme-store

This is a sample nco-control project demonstrating configuration inheritance.

## Structure

```
acme-store/
├── ncoctl.config.yaml          # Project configuration
├── .env.example                # Environment variables template
├── .gitignore
├── norce_adapter.yaml          # Shared base config
├── walley_checkout_adapter.yaml
├── sweden/                     # Channel: sweden
│   ├── norce_adapter.yaml      # Inherits, no overrides
│   └── walley_checkout_adapter.yaml
└── norway/                     # Channel: norway
    ├── norce_adapter.yaml      # Overrides country to NO
    └── walley_checkout_adapter.yaml
```

## Getting Started

1. Copy this directory to start your own project
2. Update `ncoctl.config.yaml` with your merchant and API URL
3. Copy `.env.example` to `.env` and fill in credentials
4. Run `ncoctl validate` to check your configurations
5. Run `ncoctl plan` to see what would change

## What This Demonstrates

- **Shared base configs**: `norce_adapter.yaml` and `walley_checkout_adapter.yaml` at root
- **Per-channel overrides**: Each channel has its own Walley `storeId` and Norce `defaultCountry`
- **Secret references**: Credentials use `${VAR_NAME}` placeholders from `.env`
