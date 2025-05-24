# LendPeak Repository Structure

This document outlines the layout of the LendPeak repository.
It reflects the directories currently present in the project.

## Overview

The repository is organized as follows:

```
lendpeak/
│
├── src/
│   ├── backend/        # Backend services and CDK configuration
│   ├── engine/         # Core stateless engine for lending calculations
│   ├── frontend/
│   │   └── engine-ui/  # Angular UI to interact with the engine
│   ├── mappers/        # Data mapping utilities
│   └── tester/         # Helper code used for testing
│
├── assets/             # Images and other static assets
├── data/               # Example data and scripts
├── docs/               # Project documentation
├── .github/            # GitHub configuration
├── README.md
├── LICENSE.md
├── CHANGELOG.md
└── favicon.ico
```

### Directory Descriptions

- **src/**: Contains the source code for LendPeak.
  - **backend/**: Backend service implementation and infrastructure code.
  - **engine/**: Stateless engine responsible for all lending computations.
  - **frontend/engine-ui/**: Angular application that exposes a simple UI for the engine.
  - **mappers/**: Libraries that convert external data formats into engine models.
  - **tester/**: Utilities and test harnesses used during development.

- **docs/**: Markdown documentation and guides for the project.
- **assets/**: Logos and other image assets used throughout the repository.
- **data/**: Sample datasets and related scripts.
- **.github/**: Workflow files for GitHub Actions.
- **README.md**, **LICENSE.md**, **CHANGELOG.md**: Standard project files.
- **favicon.ico**: Default icon for the web UI.
