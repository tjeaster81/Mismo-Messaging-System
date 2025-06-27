# bin/README.md
Here is where you'll find various administrative scripts, tools, and functionality.

## mismoAdmin.js (*coming soon*)
The mismoAdmin.js is a readline-based CLI utility for managing the Mismo installation.

## dnsValidation.js (*coming soon*)
The dnsValidation.js utility is what queries DNS for the domain-specific Mismo key, ensuring
that the domain is validated in the Mismo system.  For instance:
> host -t TXT mismo-dns-validation.mismo.email
> mismo-dns-validation.mismo.email descriptive text "def7279849df103d32199752f0995bd68baea94940fc3436dbc96980d5940101"
