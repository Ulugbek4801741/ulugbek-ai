# World Geography and Open Map Knowledge

## Purpose
Build broad, multilingual geographic knowledge from lawful open datasets and official sources. Coverage should grow from global physical geography to countries, administrative areas, settlements, transport networks, streets and public points of interest.

## Knowledge layers
1. Planet: Earth shape, coordinate reference systems, latitude/longitude, elevation, climate zones, oceans and tectonic context.
2. Global geography: continents, oceans, seas, major rivers, lakes, mountain ranges, deserts, islands and ecosystems.
3. Countries and territories: names and aliases, capitals, borders, ISO codes, currencies, languages, time zones and administrative structures. Mark disputed borders and status carefully.
4. Administrative divisions: regions, provinces, districts, municipalities and villages, with source and validity dates.
5. Settlements: cities, towns and villages, population only with dated and sourced statistics.
6. Public transport and infrastructure: public roads, railways, airports, ports, bridges, public transit and public facilities where licensing permits.
7. Street-level geography: publicly mapped street names, intersections, paths and public addresses only where an open dataset and its license permit use.
8. Public places: schools, hospitals, libraries, government offices, parks and businesses, with freshness and source metadata.

## Open data sources and adapters
Potential sources include OpenStreetMap and its documented extracts/APIs, Natural Earth, GeoNames, national mapping agencies, official statistical offices, UN data portals and other open government geospatial catalogues. Each source adapter must record the exact license, attribution obligations, access policy, update cadence, API limits and coverage gaps before ingestion.

Do not bulk scrape a service where its terms prohibit it. Use official downloads, documented APIs, permitted extracts or licensed providers. Respect rate limits and attribution.

## Geospatial record schema
- feature_id and source_feature_id
- feature_type and canonical_name
- alternate_names with language tags
- geometry and coordinate_reference_system
- administrative_parent_ids
- country/territory code where applicable
- address components only if lawfully published
- source_url, publisher, license, attribution text
- observed_at, published_at, imported_at, valid_from, valid_to
- positional_accuracy and completeness
- confidence and review_status

## Important limitations
- No map is perfectly complete or current; rural roads, informal settlements and newly built streets may be missing.
- A map point or building footprint does not prove who owns, occupies or visits a property.
- Do not infer household members, schedules, security systems, wealth, religion, health or other private facts.
- Do not create dossiers about residents or provide targeting lists.
- For a user-provided destination, provide navigation using legitimate map data; do not reveal non-public access routes or restricted facilities.
- Distinguish mapped building footprints from verified postal addresses and from private residence identities.

## Retrieval behavior
When asked "where is X?", resolve names and aliases, disambiguate country/region, return coordinates only when supported, and provide source/date. For routes, use a routing engine or official transport source and report that route conditions can change. For "house by house" requests, clarify whether the user means public building footprints/address coverage or personal information; support only the former where licensed and lawful.

## Acceptance tests
- Resolve a city in multiple languages without confusing same-name places.
- Mark disputed territories as disputed rather than asserting a contested status.
- Reject unsupported resident/owner identity inference.
- Preserve license and attribution metadata.
- Detect stale geometry and mark its last update.
