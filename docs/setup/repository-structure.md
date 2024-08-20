# LendPeak Repository Structure

This document provides an overview of the repository structure for the LendPeak project. The structure is designed to be simple, scalable, and easy to navigate, ensuring that all components of the project are organized in a single repository.

## Overview

The repository is organized into several main directories:

```
lendpeak/
│
├── src/
│   ├── engine/            # Core stateless engine that handles lending computations
│   │   ├── calculations/  # Modules related to financial calculations
│   │   ├── contracts/     # Handling contract parameters and logic
│   │   ├── outputs/       # Modules generating outputs based on computations
│   │   └── utils/         # Utility functions and helpers for the engine
│   │
│   ├── api/               # API that interfaces with the engine
│   │   ├── routes/        # API routes to expose engine functionality
│   │   ├── controllers/   # Controllers handling API requests
│   │   └── middlewares/   # Middleware for request processing
│   │
│   ├── backend/           # Backend services and logic, including user management
│   │   ├── services/      # Business logic and services
│   │   ├── models/        # Database models and ORM configurations
│   │   ├── controllers/   # Controllers for managing business logic
│   │   └── config/        # Backend configuration files
│   │
│   ├── frontend/          # Frontend applications and interfaces
│   │   ├── lender-portal/ # Lender's portal application
│   │   │   ├── components/ # UI components specific to the lender portal
│   │   │   ├── pages/      # Lender portal pages (e.g., Dashboard, Portfolio)
│   │   │   ├── services/   # Frontend services for API calls
│   │   │   └── styles/     # Styles specific to the lender portal
│   │   │
│   │   ├── borrower-portal/ # Borrower's portal application
│   │   │   ├── components/  # UI components specific to the borrower portal
│   │   │   ├── pages/       # Borrower portal pages (e.g., Account, Payments)
│   │   │   ├── services/    # Frontend services for API calls
│   │   │   └── styles/      # Styles specific to the borrower portal
│   │   │
│   │   └── shared/          # Shared components, services, and styles between portals
│   │       ├── components/  # Shared UI components
│   │       ├── services/    # Shared services and API calls
│   │       └── styles/      # Shared styles across both portals
│   │
│   └── common/            # Shared utilities, models, or components across the project
│
├── docs/
│   ├── architecture/
│   ├── setup/
│   ├── user-guides/
│   ├── developer-guides/
│   └── business/          # Business-related documents, including the business plan
│
├── assets/
│   ├── images/
│   └── logos/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── tools/
│   ├── build/
│   ├── deployment/
│   └── dev-scripts/
│
├── config/
│   ├── dev/
│   ├── staging/
│   └── prod/
│
├── plugins/
│   ├── custom/
│   └── third-party/
│
├── data/
│   ├── migrations/
│   ├── seeds/
│   └── backups/
│
├── db/
│   ├── schema/
│   ├── queries/
│   └── config/
│
├── .github/
│   └── workflows/
│
├── README.md
├── LICENSE
├── CHANGELOG.md
└── CONTRIBUTING.md
```

### Directory Descriptions

- **src/**: Contains the core source code for the LendPeak software. It is organized into subdirectories for different parts of the application:

  - **engine/**: Core stateless engine that handles all lending computations.
    - **calculations/**: Modules related to financial calculations.
    - **contracts/**: Handling contract parameters and business logic.
    - **outputs/**: Modules generating outputs based on the computations.
    - **utils/**: Utility functions and helpers for the engine.
  - **api/**: API that interfaces with the engine, exposing its functionality via endpoints.
    - **routes/**: API routes for different functionalities.
    - **controllers/**: Controllers managing the logic for API requests.
    - **middlewares/**: Middleware for processing API requests.
  - **backend/**: Manages the persistence, business logic, and backend services.
    - **services/**: Business logic and service layer.
    - **models/**: Database models and ORM configurations.
    - **controllers/**: Controllers managing business operations.
    - **config/**: Configuration files for the backend services.
  - **frontend/**: Contains the front-end code for both the lender and borrower portals.
    - **lender-portal/**: Application and components specific to the lender's portal.
      - **components/**: UI components specific to the lender portal.
      - **pages/**: Lender portal pages, such as Dashboard and Portfolio.
      - **services/**: Frontend services making API calls.
      - **styles/**: Styles specific to the lender portal.
    - **borrower-portal/**: Application and components specific to the borrower’s portal.
      - **components/**: UI components specific to the borrower portal.
      - **pages/**: Borrower portal pages, such as Account and Payments.
      - **services/**: Frontend services making API calls.
      - **styles/**: Styles specific to the borrower portal.
    - **shared/**: Shared components, services, and styles used across both portals.
      - **components/**: Shared UI components used in both portals.
      - **services/**: Shared services and API calls.
      - **styles/**: Shared styles across both portals.
  - **common/**: Shared utilities, models, or components that can be used throughout the project.

- **docs/**: Documentation for the project, organized by type:

  - **architecture/**: Diagrams and descriptions of the system architecture.
  - **setup/**: Setup guides, including this document.
  - **user-guides/**: Manuals and feature documentation for end users.
  - **developer-guides/**: Documentation aimed at developers.
  - **business/**: Business-related documents, including the business plan.

- **assets/**: Stores non-code assets such as images, logos, and other design materials:

  - **images/**: General images, including raw files from Photoshop and Illustrator.
  - **logos/**: Logo and branding materials.

- **tests/**: Contains all test cases, organized by type:

  - **unit/**: Unit tests for individual components.
  - **integration/**: Tests that check the interaction between different components.
  - **e2e/**: End-to-end tests that simulate real-world scenarios.

- **tools/**: Scripts and utilities that assist in development, build, and deployment:

  - **build/**: Build scripts and configuration files.
  - **deployment/**: Deployment scripts and infrastructure as code.
  - **dev-scripts/**: Miscellaneous scripts that aid in development.

- **config/**: Configuration files for various environments:

  - **dev/**: Development environment configuration.
  - **staging/**: Staging environment configuration.
  - **prod/**: Production environment configuration.

- **plugins/**: Directory for optional plugins and extensions:

  - **custom/**: Custom plugins developed in-house.
  - **third-party/**: Third-party plugins or integrations.

- **data/**: Contains data-related files such as sample datasets and database migration scripts:

  - **migrations/**: Database migration scripts.
  - **seeds/**: Seed data for initial database setup.
  - **backups/**: Directory for database backups.

- **db/**: Stores database schema definitions, predefined queries, and configuration files:

  - **schema/**: SQL scripts or schema definition files describing the structure of your database.
  - **queries/**: Predefined SQL queries, stored procedures, or functions.
  - **config/**: Configuration files related to the database, such as connection settings or ORM configurations.

- **.github/**: GitHub-specific files, such as CI/CD workflows and issue templates:

  - **workflows/**: Configuration files for GitHub Actions.

- **README.md**: The main README file that provides an overview and basic instructions for the project.

- **LICENSE**: The license file that specifies the terms under which the project can be used.

- **CHANGELOG.md**: A log of changes made to the project, organized by version.

- **CONTRIBUTING.md**: Guidelines for contributing to the project.
