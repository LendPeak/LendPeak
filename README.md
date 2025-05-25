# LendPeak

Welcome to LendPeak, an open-source lending software designed to be the best in the world, focusing on stability, transparency, and simplicity. LendPeak provides a robust platform for lenders and borrowers, ensuring smooth and reliable operations with a modern tech stack.

### Recent Changes

- The `Bill.summary` API now exposes a correctly named `remainingPrincipal` property.

## **Project Overview**

LendPeak is built using the following technologies:

- **Backend**: Node.js with TypeScript
- **Frontend**: Angular with PrimeNG
- **Database**: NoSQL
- **Version Control**: Git
- **IDE**: Visual Studio Code

### **Core Components**

LendPeak consists of several key components:

1. **Stateless Core Engine**:

   - The core of LendPeak is a stateless lending engine that doesn't require web services or databases. This engine accepts contract parameters and repayment information (such as payments, credits, restructures, notes, and modifications), performs all necessary computations, and provides a variety of outputs. The engine can operate in the browser or as a backend engine, making it highly versatile.

2. **API and Backend**:

   - The backend and API build upon the core engine, creating a web-based interface that allows lenders to log in, manage their portfolios, and service contracts. This component requires persistence and uses databases and web servers to manage users and store portfolio data.

3. **Lender's Portal**:

   - A secure portal where lenders can log in, manage their portfolios, and service contracts. This portal provides all the tools necessary for lenders to oversee their operations, including user management, contract servicing, and portfolio tracking.

4. **Borrower's Portal**:

   - A dedicated portal where borrowers can access their documentation, repayment history, amortization schedules, and forecasting. Borrowers can request modifications, schedule payments, set up autopay, update personal information, and more, depending on the features enabled by the lender.

5. **AI Integration**:
   - LendPeak incorporates AI to provide both lenders and borrowers with suggestions for the best restructuring options. This AI component uses Facebook's AI model, which can be hosted locally without requiring internet access. The AI functionality is designed as a plugin, allowing the integration of other AI models as needed.

## **Analogy: LendPeak and LendPeak Services**

Think of LendPeak as the **CentOS** of the lending software world—completely open-source, freely available, and community-driven. LendPeak Services, on the other hand, is akin to **Red Hat**—offering premium support, managed services, and consulting for those who require enterprise-grade reliability and assistance.

## **Commitment to Transparency**

LendPeak is committed to complete transparency. All aspects of the project, including our business plan and strategies, are openly shared with the community. This transparency fosters trust and collaboration, allowing everyone to see how LendPeak evolves and how decisions are made.

For more details on our business strategy and monetization plans, please refer to our [Business Plan](./docs/business/lendpeak-business-plan.md).

## **Key Features**

- **Open-Source**: LendPeak is fully open-source, allowing anyone to use, modify, and contribute to the project.
- **Modular Architecture**: The software is built with a modular approach, making it easy to extend and customize.
- **PrimeNG Design**: The UI is built using PrimeNG, offering a clean and modern interface.
- **Stateless Core**: The core engine is versatile, operating independently of web services and databases, suitable for both frontend and backend use.
- **AI-Driven Insights**: AI integration provides intelligent restructuring suggestions to both lenders and borrowers, with flexible model support through plugins.

## **Premium and Paid Options**

LendPeak offers premium services to those who need them:

- **Feature Prioritization**: While all feature developments will be open-source, certain features can be prioritized and developed sooner if a fee is negotiated.
- **Professional Services**: I am available for consulting, setup, and other professional services to help you get the most out of LendPeak. [Contact Me](mailto:winfinit+lendpeak@gmail.com) for more details.

## **LendPeak Services**

In addition to the open-source software, LendPeak Services offers:

- **Managed Model**: A fully managed service for those who prefer not to handle the technical aspects themselves.
- **Custom Development**: Tailored solutions to meet specific business needs.
- **Consulting**: Expert advice on deploying, scaling, and maintaining your LendPeak installation.

For more information about LendPeak Services, please visit [services.lendpeak.io](https://services.lendpeak.io).

## **Documentation**

Comprehensive documentation is available to help you get started and make the most of LendPeak:

- **[Repository Structure](./docs/setup/repository-structure.md)**: An overview of the project's structure and how to navigate it.
- **Setup Guides**: Detailed instructions on installing and configuring LendPeak.
- **Developer Guides**: Information for developers who want to contribute to the project.
- **User Guides**: Manuals for end-users to understand the features and capabilities of LendPeak.

## **Contribution**

Contributions are welcome! Please review the [Contribution Guidelines](./docs/developer-guides/contributing.md) before submitting a pull request.

## **License**

LendPeak is licensed under the [Mozilla Public License 2.0 (MPL 2.0)](./LICENSE), allowing for open collaboration while maintaining control over proprietary usage.

## **Contact**

For inquiries about professional services, feature prioritization, or any other questions, please [Contact Me](mailto:winfinit+lendpeak@gmail.com).

---

Thank you for choosing LendPeak. Together, we can create a better, more transparent future for lending.
