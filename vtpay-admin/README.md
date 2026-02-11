# VTPay Admin - Payment Operations Console

VTPay Admin is the financial operations control center for the VTPay payment gateway abstraction layer.

## 🎯 Purpose

This is **NOT** a regular admin panel. VTPay Admin is designed as a:
- **Bank back-office system**
- **Payment processor console**
- **Financial operations control room**

It controls money flow, manages risk, and provides complete visibility into the payment system.

## 🏗️ Architecture

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **State Management**: React Query (planned)
- **Icons**: Inline SVG

## 📁 Project Structure

```
vtpay-admin/
├── src/
│   ├── components/          # Shared UI components
│   │   ├── Layout.tsx      # Main layout wrapper
│   │   ├── Sidebar.tsx     # Navigation sidebar (green theme)
│   │   └── Topbar.tsx      # Header with admin info
│   ├── pages/              # Page components
│   │   ├── dashboard/      # Dashboard with metrics
│   │   ├── tenants/        # Tenant management
│   │   ├── zainbox/        # Zainbox control
│   │   ├── transactions/   # Transaction ledger
│   │   ├── settlements/    # Settlement controls
│   │   ├── webhooks/       # Webhook monitoring
│   │   ├── api-keys/       # API key management
│   │   ├── fees/           # Fee configuration
│   │   ├── risk/           # Risk & compliance
│   │   └── settings/       # System configuration
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── api/                # API client
│   ├── types/              # TypeScript types
│   └── main.tsx            # Entry point
```

## 🎨 Design System

### Colors
- **Primary**: Green (matching app-admin)
  - Sidebar: `from-green-950 via-green-900 to-green-950`
  - Accents: `green-400` to `green-600`
- **Background**: `slate-50`
- **Cards**: White with `slate-200` borders

### Layout
- **Sidebar**: Collapsible (64px collapsed, 256px expanded)
- **Topbar**: Sticky, 64px (mobile) / 80px (desktop)
- **Content**: Scrollable main area

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
cd vtpay-admin
npm install
```

### Development
```bash
npm run dev
```
Access at `http://localhost:5175`

### Build
```bash
npm run build
```

## 📊 Core Sections

### 1. Dashboard
**Purpose**: Situational awareness  
**Key Metrics**:
- Total inflow/outflow (real-time)
- Pending settlements
- Failed transactions
- Active tenants
- API usage & health
- Webhook success rate

### 2. Tenants Management
**Purpose**: Control who has access  
**Features**:
- Tenant list & search
- Status management (active/frozen/limited)
- Wallet balances
- Transaction limits
- Fee plan assignment

### 3. Zainbox Management
**Purpose**: Internal Zainpay control  
**Features**:
- View all Zainboxes
- Balance monitoring
- Settlement plan configuration
  - Tenant mapping
- Anomaly detection

### 4. Transactions & Ledger
**Purpose**: Source of truth for all money movement  
**Features**:
- Advanced filtering (tenant, date, type, status)
- Raw Zainpay payload viewer
- Normalized VTPay records
- Status timeline visualization
- Manual verification tools
- Flag & investigate

### 5. Settlements & Payouts
**Purpose**: Control money leaving the system  
**Features**:
- Settlement schedules (T1, T7, T30)
- Pending/processed views
- Manual trigger (with audit log)
- Pause/resume controls
- Override with required justification

### 6. API & Key Management
**Purpose**: Developer access control  
**Features**:
- API key registry (masked)
- Tenant ownership
- Scope management
- Usage metrics
- Abuse detection
- IP blocking
- Rate limit configuration

### 7. Webhooks & Events
**Purpose**: Prevent silent failures  
**Features**:
- Incoming webhook log (Zainpay → VTPay)
- Signature verification status
- Dispatch status (VTPay → Tenant)
- Retry management
- Payload inspector
- Replay functionality

### 8. Fees & Revenue
**Purpose**: Business control center  
**Features**:
- Total fees collected
- Per-tenant breakdown
- Provider fees (Zainpay costs)
- Net revenue calculation
- Global fee rules
- Tenant-specific overrides
- Promotions & waivers

### 9. Risk & Compliance
**Purpose**: Fraud prevention  
**Features**:
- Abnormal pattern detection
- Rapid balance movement alerts
- Repeated failure tracking
- Suspicious tenant flagging
- Freeze controls
- Audit log export

### 10. System Settings
**Purpose**: Critical configuration  
**Features** (highly restricted):
- Zainpay credentials
- Environment toggles (sandbox/live)
- Maintenance mode
- Feature flags
- Alert thresholds

## 🔐 Permission Model

| Role          | Access Level                  |
|---------------|-------------------------------|
| Super Admin   | Full access to everything     |
| Ops Admin     | Transactions & settlements    |
| Support Admin | Read-only + add notes         |
| Tenant Admin  | **No access to this panel**   |

## 🎯 Key Design Principles

1. **Financial First**: Every decision prioritizes money safety
2. **Audit Everything**: All actions logged with reason
3. **Never Trust**: Always verify from source
4. **Fail Visible**: Problems should be obvious
5. **Control, Don't Replace**: VTPay controls, Zainpay executes

## 🔗 Integration Points

- **Backend**: VTPay Server (`vtpay-server`)
- **Payment Provider**: Zainpay
- **Frontend**: Separate from VTFree app-admin
- **Authentication**: Shared with VTFree (planned)

## 📝 Development Notes

- Layout copied exactly from `app-admin` for consistency
- Sidebar uses same green gradient theme
- Topbar matches app-admin styling
- All pages use placeholder content initially
- Focus on operations, not marketing

## 🚦 Status

**Current Phase**: Initial Setup ✅
- [x] Project scaffolding
- [x] Tailwind CSS configuration
- [x] Sidebar component (green theme)
- [x] Topbar component
- [x] Layout wrapper
- [x] Dashboard page (metrics view)
- [x] Routing setup
- [ ] Backend integration
- [ ] Authentication
- [ ] Full page implementations

## 📞 Support

For issues or questions, contact the VTPay development team.

---

**Remember**: This is a financial operations console. Design it like you're building the cockpit of a plane, not a smartphone app.
