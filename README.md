<div align="center">

# X-ray Atlas

**The Open Database for Near-Edge X-ray Absorption Fine Structure Spectroscopy**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Live Demo](https://xray-atlas.vercel.app) | [Documentation](#documentation) | [Contributing](#contributing)

</div>

---

## Overview

X-ray Atlas is a collaborative platform for discovering, sharing, and analyzing Near-Edge X-ray Absorption Fine Structure (NEXAFS) spectroscopy data. Built for researchers, by researchers.

### Why X-ray Atlas?

- **Discoverable Data** - Search molecules by name, formula, CAS number, or SMILES notation
- **Interactive Visualization** - Explore spectra with zoom, pan, peak fitting, and normalization tools
- **Community-Driven** - Upvote quality data, contribute your measurements, link publications
- **Open Science** - All data freely accessible under open data licenses

---

## Features

### Spectrum Visualization

Interactive plotting powered by visx with scientific-grade precision:

- Multi-trace overlay with automatic color assignment
- Zoom and pan with brush selection
- Peak identification and Gaussian fitting
- Pre/post-edge normalization regions
- Reference spectrum comparison
- Difference spectra calculation
- Export-ready publication figures

### Molecule Database

Comprehensive chemical information:

- IUPAC names with common synonyms
- Chemical formulas, SMILES, and InChI identifiers
- PubChem CID and CAS number linking
- 2D structure visualization via PubChem
- Community upvoting for data quality signals

### Experiment Metadata

Full provenance tracking:

- Facility and beamline identification
- Polarization geometry (azimuth/polar angles)
- Edge and core-level specification (K, L1-L3, M1-M3)
- Sample preparation methods
- Calibration standards
- Publication DOI linking

### Data Contribution

Streamlined upload workflow:

- CSV spectrum import with preview
- Molecule lookup via PubChem API
- Facility/instrument registration
- ORCID authentication

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | [Bun](https://bun.sh/) |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5.8](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Components** | [HeroUI](https://heroui.com/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/) |
| **ORM** | [Prisma](https://www.prisma.io/) |
| **API** | [tRPC](https://trpc.io/) |
| **Auth** | [NextAuth.js](https://authjs.dev/) with ORCID |
| **Visualization** | [visx](https://airbnb.io/visx/) + [D3](https://d3js.org/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- PostgreSQL database (or [Supabase](https://supabase.com/) account)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/xray-atlas.git
cd xray-atlas

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# Generate Prisma client
bun run db:generate

# Run database migrations
bun run db:migrate

# Start development server
bun run dev
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
AUTH_SECRET="your-auth-secret"
AUTH_ORCID_ID="your-orcid-client-id"
AUTH_ORCID_SECRET="your-orcid-client-secret"

# Storage (optional)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="..."
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with Turbopack |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run check` | Run linting and type checking |
| `bun run lint` | Run ESLint |
| `bun run lint:fix` | Fix ESLint errors |
| `bun run format:check` | Check Prettier formatting |
| `bun run format:write` | Fix Prettier formatting |
| `bun run db:generate` | Generate Prisma migrations |
| `bun run db:migrate` | Deploy Prisma migrations |
| `bun run db:push` | Push schema changes (dev only) |
| `bun run db:studio` | Open Prisma Studio |

---

## Project Structure

```
xray-atlas/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # SQL migrations
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── browse/            # Browse pages
│   │   ├── contribute/        # Data contribution flow
│   │   ├── facilities/        # Facility pages
│   │   ├── molecules/         # Molecule detail pages
│   │   └── components/        # Page-specific components
│   ├── components/            # Shared components
│   │   ├── auth/              # Authentication components
│   │   ├── feedback/          # Loading/error states
│   │   ├── layout/            # Header, footer, navigation
│   │   ├── molecules/         # Molecule display components
│   │   ├── plots/             # Spectrum visualization
│   │   │   ├── hooks/         # Plot state management
│   │   │   ├── utils/         # Plot utilities
│   │   │   └── visx/          # visx-based components
│   │   ├── theme/             # Theme provider and toggle
│   │   └── ui/                # Base UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   ├── server/
│   │   ├── api/
│   │   │   └── routers/       # tRPC routers
│   │   ├── auth.ts            # Auth configuration
│   │   ├── db.ts              # Prisma client
│   │   └── storage.ts         # S3 storage
│   ├── trpc/                  # tRPC client setup
│   ├── types/                 # TypeScript types
│   └── utils/                 # Shared utilities
└── tailwind.config.js         # Tailwind configuration
```

---

## Documentation

### Database Schema

The database models the full experimental workflow:

```
molecules ─┬─> samples ─┬─> experiments ─┬─> spectrumpoints
           │            │                ├─> peaksets
           │            │                └─> experimentquality
           │            └─> vendors
           └─> moleculesynonyms

facilities ──> instruments ──> experiments

publications <──> experimentpublications <──> experiments

edges ──> experiments
polarizations ──> experiments
calibrationmethods ──> experiments
```

### Core Entities

| Entity | Description |
|--------|-------------|
| `molecules` | Chemical compounds with identifiers (SMILES, InChI, CAS) |
| `samples` | Physical samples prepared for measurement |
| `experiments` | Individual NEXAFS measurements |
| `spectrumpoints` | Energy vs. absorption data points |
| `peaksets` | Identified spectral features with assignments |
| `facilities` | Synchrotrons, FELs, and lab sources |
| `instruments` | Beamlines and endstations |
| `publications` | DOI-linked references |

---

## API Reference

### tRPC Endpoints

All API endpoints are type-safe via tRPC. Available routers:

| Router | Description |
|--------|-------------|
| `molecules` | CRUD operations, search, upvoting |
| `experiments` | Experiment queries with spectrum data |
| `spectrumpoints` | Bulk spectrum data access |
| `facilities` | Facility and instrument lookup |
| `samples` | Sample metadata |
| `publications` | DOI lookup and linking |
| `external` | PubChem integration |
| `physics` | Reference data (edges, binding energies) |

### Example: Fetching Spectrum Data

```typescript
import { trpc } from "~/trpc/client";

// Get molecule with experiments
const { data } = trpc.molecules.getById.useQuery({
  id: "molecule-uuid",
  includeExperiments: true,
});

// Get spectrum points for an experiment
const { data: spectrum } = trpc.spectrumpoints.getByExperimentId.useQuery({
  experimentId: "experiment-uuid",
});
```

---

## REST API (Coming Soon)

A public REST API is planned for programmatic access without tRPC.

### Authentication

```bash
# Obtain API key from your account settings
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://xray-atlas.vercel.app/api/v1/molecules
```

### Endpoints

#### Molecules

```http
GET /api/v1/molecules
GET /api/v1/molecules/:id
GET /api/v1/molecules/search?q=benzene
GET /api/v1/molecules/:id/experiments
```

#### Experiments

```http
GET /api/v1/experiments/:id
GET /api/v1/experiments/:id/spectrum
GET /api/v1/experiments/:id/peaks
```

#### Facilities

```http
GET /api/v1/facilities
GET /api/v1/facilities/:id/instruments
```

### Response Format

```json
{
  "data": {
    "id": "uuid",
    "iupacname": "benzene",
    "chemicalformula": "C6H6",
    "smiles": "c1ccccc1",
    "experiments": [
      {
        "id": "uuid",
        "edge": { "targetatom": "C", "corestate": "K" },
        "facility": "Advanced Light Source",
        "instrument": "BL-8.0.1"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-29T12:00:00Z",
    "version": "1.0"
  }
}
```

### Rate Limits

| Tier | Requests/Hour | Burst |
|------|---------------|-------|
| Anonymous | 100 | 10 |
| Authenticated | 1,000 | 50 |
| Contributor | 10,000 | 100 |

---

## Python Integration (Coming Soon)

### xray-atlas-py

A Python client library for seamless integration with scientific workflows.

#### Installation

```bash
pip install xray-atlas
# or
uv add xray-atlas
```

#### Quick Start

```python
import xray_atlas as xa

# Initialize client
client = xa.Client(api_key="YOUR_API_KEY")

# Search molecules
results = client.molecules.search("polythiophene")

# Get spectrum data as numpy arrays
spectrum = client.experiments.get_spectrum("experiment-uuid")
energy = spectrum.energy  # np.ndarray in eV
absorption = spectrum.absorption  # np.ndarray (normalized)

# Get as pandas DataFrame
df = spectrum.to_dataframe()
```

#### Integration with Analysis Tools

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.signal import find_peaks
import xray_atlas as xa

client = xa.Client()

# Fetch C K-edge spectrum for benzene
molecule = client.molecules.get_by_name("benzene")
experiments = client.experiments.list(
    molecule_id=molecule.id,
    edge="C-K"
)

# Plot all available spectra
fig, ax = plt.subplots(figsize=(10, 6))

for exp in experiments:
    spectrum = exp.get_spectrum()
    ax.plot(
        spectrum.energy,
        spectrum.absorption,
        label=f"{exp.facility.name} - {exp.instrument.name}"
    )

ax.set_xlabel("Photon Energy (eV)")
ax.set_ylabel("Absorption (a.u.)")
ax.legend()
plt.show()
```

#### Peak Fitting

```python
from xray_atlas.analysis import fit_peaks, gaussian

spectrum = client.experiments.get_spectrum("experiment-uuid")

# Automatic peak detection
peaks = fit_peaks(
    spectrum.energy,
    spectrum.absorption,
    model="gaussian",
    n_peaks="auto",
    energy_range=(284, 292)
)

for peak in peaks:
    print(f"Peak at {peak.center:.2f} eV, FWHM: {peak.fwhm:.2f} eV")
```

#### Batch Downloads

```python
# Download all C K-edge data for organic semiconductors
query = client.molecules.search(
    contains_atoms=["C", "S"],
    has_edge="C-K",
    min_experiments=2
)

# Export to HDF5 for large datasets
client.bulk_export(
    molecules=query.ids,
    format="hdf5",
    output_path="organic_semiconductors_c_kedge.h5"
)

# Export to CSV
client.bulk_export(
    molecules=query.ids,
    format="csv",
    output_dir="./spectra/"
)
```

#### Data Contribution

```python
import xray_atlas as xa
import pandas as pd

client = xa.Client(api_key="YOUR_API_KEY")

# Upload spectrum from CSV
df = pd.read_csv("my_spectrum.csv")

experiment = client.experiments.create(
    molecule_id="benzene-uuid",
    facility_id="als-uuid",
    instrument_id="bl801-uuid",
    edge="C-K",
    polarization={"azimuth": 0, "polar": 55},
    measurement_date="2026-01-15",
    spectrum=df[["energy_eV", "absorption"]].values
)

print(f"Created experiment: {experiment.id}")
```

#### Type Hints

Full type annotations for IDE support:

```python
from xray_atlas.types import Molecule, Experiment, Spectrum

def analyze_spectrum(spectrum: Spectrum) -> dict[str, float]:
    """Calculate spectral statistics."""
    return {
        "max_absorption": float(spectrum.absorption.max()),
        "edge_jump": calculate_edge_jump(spectrum),
        "centroid": calculate_centroid(spectrum)
    }
```

---

## Contributing

We welcome contributions from the X-ray spectroscopy community.

### Ways to Contribute

1. **Upload Data** - Share your NEXAFS measurements
2. **Report Issues** - Found a bug? [Open an issue](https://github.com/your-org/xray-atlas/issues)
3. **Feature Requests** - [Suggest improvements](https://github.com/your-org/xray-atlas/issues/new?template=feature_request.md)
4. **Code Contributions** - Fork, branch, and submit a PR

### Development Workflow

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/xray-atlas.git

# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
bun run check
bun run build

# Commit with conventional commits
git commit -m "feat: add spectrum export to PNG"

# Push and create PR
git push origin feature/your-feature
```

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Conventional commits for changelog generation

---

## Roadmap

### Q1 2026
- [x] Core spectrum visualization
- [x] Molecule search and browse
- [x] ORCID authentication
- [x] Data contribution workflow

### Q2 2026
- [ ] Public REST API v1
- [ ] Python client library
- [ ] Bulk data export (CSV, HDF5)
- [ ] Advanced peak fitting UI

### Q3 2026
- [ ] EXAFS support
- [ ] Theoretical spectrum overlay
- [ ] DOI minting for datasets
- [ ] Institution dashboards

### Q4 2026
- [ ] Machine learning peak assignment
- [ ] Spectrum similarity search
- [ ] Jupyter notebook integration
- [ ] Community forums

---

## Citation

If you use X-ray Atlas in your research, please cite:

```bibtex
@software{xray_atlas,
  title = {X-ray Atlas: An Open Database for NEXAFS Spectroscopy},
  author = {X-ray Atlas Contributors},
  year = {2026},
  url = {https://xray-atlas.vercel.app},
  version = {0.1.0}
}
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Data contributed to X-ray Atlas is made available under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license unless otherwise specified.

---

## Acknowledgments

- Built with the [T3 Stack](https://create.t3.gg/)
- Hosted on [Vercel](https://vercel.com/)
- Database powered by [Supabase](https://supabase.com/)
- Chemical data from [PubChem](https://pubchem.ncbi.nlm.nih.gov/)

---

<div align="center">

**[Website](https://xray-atlas.vercel.app)** | **[Issues](https://github.com/your-org/xray-atlas/issues)** | **[Discussions](https://github.com/your-org/xray-atlas/discussions)**

Made with care for the X-ray spectroscopy community

</div>
