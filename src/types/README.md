# src/types

`EntityRole` registry, `CapabilityProfile`, `MvhrSnapshot`, and `CardConfig` interfaces. See `docs/architecture.md` §4–§6.

Phase 1 subset implemented: `hass.ts`, `manufacturer.ts`, `entity-roles.ts`, `capability.ts`, `config.ts`, `snapshot.ts`. `entity-roles.ts` currently declares the 8 roles the Phase 1 card interface uses, not the full SPECIFICATION.md §2 table — later phases add roles here as they're implemented.
