# Trading Tools

Trading Tools is a trading decision-support workspace built to help traders move from market information to a defined, measurable trading decision.

It is not a broker, exchange, signal-selling service, or trade execution platform. The product is focused on the work that happens around a trade: researching markets, calculating risk, planning positions, recording decisions, and eventually reviewing what happened.

## Product Direction

The core workflow is:

**Learn → Calculate → Analyze → Plan → Manage Risk → Decide → Record → Review → Improve**

Trading Tools is being built around that workflow rather than as a collection of unrelated calculators. Individual tools handle specific parts of the process, while the workspace provides continuity between them.

The long-term goal is a practical trading workspace where market context, calculations, trade plans, records, and analysis can live together without turning the product into an execution platform.

## Current Capabilities

### Trading Tools

The current tool registry includes:

- **Position Size** — Convert defined account risk, entry, and stop-loss levels into a position size.
- **Risk / Reward** — Evaluate the relationship between defined trade risk and potential reward.
- **PnL** — Calculate trade profit or loss from price movement, position size, and fees.
- **Leverage** — Measure exposure, effective leverage, and required margin.
- **Currency Converter** — Convert between supported currencies using current exchange-rate data.
- **Coin Viewer** — Inspect cryptocurrency information and market data.

Additional tools are intentionally kept visible as planned work rather than presented as finished functionality.

### Market Terminal

The market area provides:

- Live market prices
- Crypto, stock, and forex market categories
- Market search
- Market detail views
- Price changes and key market statistics
- Historical chart intervals
- Direct paths from market context into relevant trading tools

### Workspace

The workspace is the foundation for connecting individual tools into a persistent trading workflow.

The application also includes account authentication, onboarding, preferences, settings, and user-specific workspace functionality backed by Supabase.

## Architecture

Trading Tools is currently a lightweight Vite application using TypeScript and JavaScript, with Supabase providing the backend services required for authentication and persistent user data.

The codebase is organized around:

- **Pages** — application entry points and user-facing workflows
- **Components** — reusable interface elements
- **Data** — shared data access and Supabase integration
- **Auth** — authentication and session-related logic
- **Styles** — application styling and page-specific presentation

The project deliberately avoids unnecessary framework and infrastructure complexity while the product is being validated.

## Roadmap

The roadmap is intentionally directional rather than tied to rigid version numbers.

### Near Term

- Strengthen the core trading workflow
- Expand risk and trade-planning tools
- Improve workspace continuity between tools
- Continue improving market data and market context
- Refine authentication, profiles, preferences, and persistent user data
- Establish a stronger foundation for trade records and review

### Later

- Advanced trade and strategy analysis
- Portfolio and performance analysis
- Historical trade analytics
- More capable simulations and backtesting
- Deeper research workflows
- AI-assisted analysis where it provides genuine decision-support value

### Future TDS Integration

**Trading Signal Dropper (TDS)** is a separate project and is not currently integrated into Trading Tools.

TDS is intended as a future integration point rather than something that should be forced into the current product prematurely.

The intended relationship is:

**TDS identifies or delivers a trading opportunity → Trading Tools provides the context, calculations, analysis, planning, risk management, decision, and record around it.**

The integration will be designed when the existing products and their workflows provide enough evidence for a useful connection.

## Product Boundaries

Trading Tools supports trading decisions; it does not execute trades.

The product is not intended to:

- Place orders on exchanges or brokers
- Custody user funds
- Replace a broker or exchange
- Present calculations as guaranteed trading outcomes
- Turn every trading concept into an automated feature

The product should remain useful because it improves the quality and consistency of a trader's process, not because it pretends to predict the market.

### Age Restriction

Trading Tools is intended for users aged **18 and older**.

The product provides tools and information related to trading and financial decision-making and is not intended for minors.

## Development

Install dependencies:

    npm install

Start the development server:

    npm run dev

Build for production:

    npm run build

Typecheck:

    npm run typecheck

### Stack

- TypeScript
- JavaScript
- HTML/CSS
- Vite
- Supabase

Node.js 20.19+ is required.



## Deployment

Trading Tools is deployed independently from the broader TGG HUB ecosystem.

Live application:

https://trading-tools-xi.vercel.app



## Status

**Active development.**

The current priority is to strengthen the core decision-support workflow and turn the existing tools, market context, workspace, and user foundation into a coherent product.

Trading Tools is being developed as an independent product within the broader TGG HUB ecosystem.