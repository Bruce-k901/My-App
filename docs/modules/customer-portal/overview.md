# Customer Portal Module Overview

## Purpose

The Customer Portal is a customer-facing web application that enables Opsly's Planly customers to place orders, track deliveries, log waste, communicate with suppliers, provide feedback, and access reports. It's a separate interface from the main dashboard designed for external customer access.

## Module Location

- **Routes**: `src/app/customer/`
- **Components**: `src/components/customer/`
- **API**: `src/app/api/customer/`
- **Layout**: `src/app/customer/layout.tsx`
- **Shared Logic**: `src/lib/order-book/customer.ts`

## Authentication & Access

### Customer Authentication

The portal uses Supabase authentication with email/password:

- Login page: `/customer/login`
- Customer records linked via email in `planly_customers` table
- Auto-redirect to login if unauthenticated

### Admin Preview Mode

Platform admins and app owners can preview the customer experience:

- Shows orange "PREVIEW MODE" banner
- Customer selector dropdown
- "Back to Planly" button
- Session storage: `admin_preview_mode` and `admin_preview_customer_id`

### Data Scoping

All customer data is scoped by:

- Customer ID (from `planly_customers`)
- Site ID (customer's associated site)
- Email verification for security

## Navigation Structure

### Main Routes

```
/customer/
  ├── login/              # Customer authentication
  ├── dashboard/          # Overview with widgets
  ├── orders/             # Order management
  │   ├── [id]/          # View/edit specific order
  │   └── new/           # Create new order (legacy)
  ├── standing-orders/    # Recurring orders setup
  ├── waste/             # Waste tracking
  │   ├── log/           # Log waste for orders
  │   └── insights/      # Waste analytics
  ├── messages/          # Customer-supplier messaging
  ├── reports/           # Reports and analytics
  │   └── monthly/       # Monthly spend reports
  ├── feedback/          # Ratings and feedback
  └── setup/             # Profile configuration
```

### Layout Features

The portal layout (`layout.tsx`) provides:

**Header Navigation** (Desktop):

- Logo/brand (links to dashboard)
- Dashboard, Orders, Waste Tracking, Messages, Feedback
- Sign Out button (hidden in admin preview mode)

**Mobile Menu**:

- Hamburger menu toggle
- Same navigation items
- Mobile-optimized spacing

**Admin Preview Bar** (when admin viewing):

- Orange banner across top
- Customer selector dropdown
- Back to Planly button

## Key Features

### 1. Dashboard (`/customer/dashboard`)

**Purpose**: Customer overview with key metrics and quick actions

**Displays**:

- Monthly spend card (current month spending)
- Waste dashboard widget (waste tracking metrics)
- Upcoming orders list (next 14 days)
- Quick actions: New Order, Skip Week buttons

**Key Components**:

- `MonthlySpendCard.tsx` - Shows current month total
- `WasteDashboardWidget.tsx` - Waste insights

### 2. Order Management (`/customer/orders`)

**Purpose**: Grid-based ordering system for weekly orders

**Features**:

- Product catalog with customer pricing
- Weekly grid view (dates as columns, products as rows)
- Quantity input per product per date
- Order status tracking (pending, confirmed, prepared, shipped)
- Total calculations with customer-specific pricing
- Edit existing orders
- Standing order generation
- Week navigation (previous/next week)

**Order Flow**:

1. View products with custom pricing
2. Enter quantities in weekly grid
3. Submit orders for multiple dates
4. Track order status
5. Edit before order is prepared

**Status Workflow**:

- `pending` → `confirmed` → `prepared` → `packed` → `shipped` → `delivered`
- Customers can edit until `prepared` status

### 3. Standing Orders (`/customer/standing-orders`)

**Purpose**: Set up recurring weekly orders

**Features**:

- Create recurring order templates
- Select delivery days (e.g., Monday, Wednesday, Friday)
- Set product quantities per day
- Auto-generate orders from standing orders
- Update/modify standing order patterns

**Database**:

- Table: `planly_standing_orders`
- Links to `planly_customers`
- Stores: customer_id, delivery_days, items array

### 4. Waste Tracking (`/customer/waste`)

**Sub-routes**:

- `/waste` - Main waste overview
- `/waste/log` - Log waste for specific orders
- `/waste/insights` - Waste analytics and trends

**Purpose**: Track product waste to improve ordering accuracy

**Workflow**:

1. Customer receives order
2. Navigate to waste log
3. Select order from pending list
4. Enter "sold" quantities for each product
5. System calculates waste (ordered - sold)
6. View insights on waste patterns

**Benefits**:

- Identifies overordering patterns
- Suggests order quantity adjustments
- Reduces food waste
- Cost savings analysis

**Database**:

- Table: `order_book_waste_logs`
- Links to `planly_orders` and `planly_order_lines`
- Tracks: item_id, ordered_qty, sold_qty, waste_qty

### 5. Messaging (`/customer/messages`)

**Purpose**: Direct communication with supplier/admin

**Features**:

- Thread-based messaging
- File attachments
- Issue reporting with categories
- Comment on existing issues
- Message status tracking (unread counts)

**Database Tables**:

- `order_book_message_threads` - Conversation threads
- `order_book_messages` - Individual messages
- `order_book_issues` - Reported issues
- `order_book_issue_comments` - Issue thread comments

**Issue Categories**:

- Quality issues
- Delivery problems
- Billing questions
- Product inquiries
- General feedback

### 6. Feedback & Ratings (`/customer/feedback`)

**Purpose**: Collect customer satisfaction data

**Features**:

- Rate orders (1-5 stars)
- Product quality feedback
- Delivery experience ratings
- General comments
- View feedback history

**Database**:

- Table: `order_book_ratings`
- Links to orders and products
- Stores: rating, feedback_text, category

### 7. Reports (`/customer/reports/monthly`)

**Purpose**: Customer spend and order analytics

**Features**:

- Monthly spend breakdown
- Order frequency analysis
- Top products by spend
- Waste trends over time
- Exportable reports (coming soon)

### 8. Setup (`/customer/setup`)

**Purpose**: Customer profile and preferences

**Features**:

- Business information
- Delivery preferences
- Contact details
- Notification settings

## API Endpoints

### Customer API Routes (`/api/customer/`)

All endpoints require authentication and return customer-scoped data:

| Endpoint                     | Method       | Purpose                    |
| ---------------------------- | ------------ | -------------------------- |
| `/profile`                   | GET/PUT      | Customer profile data      |
| `/orders`                    | GET/POST     | List and create orders     |
| `/orders/[id]`               | GET/PUT      | View/update specific order |
| `/orders/[id]/items`         | GET          | Order line items           |
| `/orders/batch`              | POST         | Bulk order creation        |
| `/orders/generate-from-week` | POST         | Generate from grid         |
| `/standing-orders`           | GET/POST/PUT | Recurring orders           |
| `/pricing`                   | GET          | Customer-specific pricing  |
| `/products`                  | GET          | Available product catalog  |
| `/messages`                  | GET/POST     | Message threads            |
| `/messages/[threadId]`       | GET/POST     | Thread messages            |
| `/issues`                    | GET/POST     | Issue reporting            |
| `/issues/[issueId]/comments` | GET/POST     | Issue comments             |
| `/waste/log`                 | POST         | Submit waste log           |
| `/waste/logs`                | GET          | Waste history              |
| `/waste/pending`             | GET          | Orders pending waste log   |
| `/waste/insights`            | GET          | Waste analytics            |
| `/ratings`                   | GET/POST     | Feedback and ratings       |
| `/reports/monthly`           | GET          | Monthly reports            |
| `/credit-requests`           | POST         | Request credit/refund      |

### Authentication Pattern

```typescript
// All customer APIs follow this pattern:
const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();
if (userError || !user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Get customer record
const { data: customer } = await supabase
  .from("planly_customers")
  .select("id, site_id")
  .eq("email", user.email?.toLowerCase() || "")
  .eq("is_active", true)
  .maybeSingle();

if (!customer) {
  return NextResponse.json({ error: "Customer not found" }, { status: 404 });
}
```

## Key Components

### Customer-Specific Components (`src/components/customer/`)

| Component                     | Purpose                         |
| ----------------------------- | ------------------------------- |
| `MonthlySpendCard.tsx`        | Displays current month spending |
| `WasteDashboardWidget.tsx`    | Waste tracking overview         |
| `NotificationPreferences.tsx` | Customer notification settings  |

### Shared Components

Customer portal uses many shared UI components:

- `Button`, `Input`, `Card` from `src/components/ui/`
- Icons from `lucide-react`
- Date utilities from `date-fns`

## Database Schema

### Primary Tables

```sql
-- Customer Records
planly_customers
  - id, business_name, email, site_id, is_active
  - delivery_preferences, notification_settings

-- Orders
planly_orders
  - id, customer_id, delivery_date, status
  - total_value, notes, created_at

-- Order Lines
planly_order_lines
  - id, order_id, product_id, quantity
  - unit_price_snapshot, ship_state

-- Standing Orders
planly_standing_orders
  - id, customer_id, delivery_days
  - items (JSONB), is_active

-- Waste Tracking
order_book_waste_logs
  - id, customer_id, order_id, item_id
  - ordered_qty, sold_qty, waste_qty, waste_pct

-- Messaging
order_book_message_threads
  - id, customer_id, subject
  - last_message_at, unread_count

order_book_messages
  - id, thread_id, content, sender_type
  - is_read, attachments

-- Issues
order_book_issues
  - id, customer_id, order_id, category
  - status, priority, description

order_book_issue_comments
  - id, issue_id, author_type, content

-- Ratings
order_book_ratings
  - id, customer_id, order_id, rating
  - feedback_text, category
```

### Customer Pricing

Customer-specific pricing overrides default list prices:

- Table: `planly_customer_pricing`
- Links: customer_id, product_id
- Fields: custom_price

## Styling & Theme

### Design System

The customer portal uses a distinct visual style:

**Colors**:

- Background: `#0B0D13` (dark navy)
- Primary accent: `#EC4899` (pink/magenta)
- Text: White with opacity variations
- Borders: White with 6% opacity

**Typography**:

- Modern, clean sans-serif
- Clear hierarchy
- Mobile-friendly sizing

**Layout**:

- Max width: `7xl` (1280px)
- Responsive padding
- Mobile-first approach

### Dark Theme

Portal is dark-themed by default:

- Background: `dark:bg-[#0B0D13]`
- Cards: `dark:bg-white/[0.03]`
- Borders: `dark:border-white/[0.06]`
- Text: `dark:text-white` with opacity

## Mobile Experience

The portal is fully mobile-responsive:

**Features**:

- Collapsible mobile menu
- Touch-friendly buttons
- Simplified layouts for small screens
- Grid scrolling for order tables
- Mobile-optimized spacing

**Breakpoints**:

- Mobile: `< 768px` (md)
- Tablet: `768px - 1024px` (lg)
- Desktop: `> 1024px` (xl)

## State Management

### Client-Side State

Portal uses React hooks for state:

- `useState` - Component state
- `useEffect` - Data fetching
- `useRouter` - Navigation
- `useSearchParams` - URL parameters

### Session Storage

For admin preview mode:

```typescript
sessionStorage.setItem("admin_preview_mode", "true");
sessionStorage.setItem("admin_preview_customer_id", customerId);
```

## Data Flow

### Typical Order Flow

```
1. Customer logs in → Verify via planly_customers
2. View dashboard → Fetch orders, waste, spend
3. Navigate to orders → Load products + pricing
4. Enter quantities → Local state management
5. Submit orders → POST /api/customer/orders/batch
6. Server processes → Create planly_orders + lines
7. Confirmation → Refresh dashboard data
8. Track status → Real-time order updates
```

### Waste Logging Flow

```
1. Order delivered → Customer receives products
2. Track sales → Note actual quantities sold
3. Navigate to waste log → View pending orders
4. Select order → Load order items
5. Enter sold quantities → Calculate waste
6. Submit log → POST /api/customer/waste/log
7. View insights → Analyze waste patterns
```

## Integration with Planly

The customer portal is tightly integrated with Planly module:

**Shared Data**:

- Products from `planly_products` (linked to `ingredients_library`)
- Orders in `planly_orders` table
- Customer records in `planly_customers`
- Pricing from `planly_customer_pricing`

**Admin Access**:

- Planly users can preview customer portal
- View orders from customer perspective
- Test ordering workflows
- Manage customer data via Planly admin

## Security Considerations

### Row-Level Security (RLS)

All customer tables use RLS policies:

- Customers can only see their own data
- Email-based verification
- Site-scoped access control

### Email Verification

Customer identity verified via:

1. Supabase auth user email
2. Match to `planly_customers.email`
3. Require `is_active = true`

### Input Validation

- Server-side validation on all endpoints
- Type checking via TypeScript
- Quantity limits and bounds checking
- Price tampering prevention

## Error Handling

### Graceful Degradation

Portal handles missing features:

```typescript
if (threadsError?.code === "42P01") {
  console.warn("Message threads table does not exist yet");
  return NextResponse.json({ success: true, data: [] });
}
```

### User-Facing Errors

- Clear error messages
- Redirect to login on auth failure
- Toast notifications for actions
- Loading states during operations

## Performance Optimizations

### Data Loading

- Parallel API calls with `Promise.all()`
- Conditional loading based on route
- Pagination for large datasets
- Caching customer profile data

### UI Optimizations

- Lazy loading for components
- Debounced input fields
- Optimistic UI updates
- Loading skeletons

## Future Enhancements

Potential features based on codebase structure:

- Real-time order status updates
- Export reports to PDF/Excel
- Bulk order templates
- Advanced waste analytics
- Push notifications
- Mobile app companion
- Multiple delivery addresses
- Order history search
- Product favorites/quick orders
- Seasonal product catalogs

## Related Modules

### Planly Integration

Customer portal is the customer-facing side of Planly:

- **Planly**: Internal admin tools for managing orders, production, customers
- **Customer Portal**: External interface for customers to place orders

### Data Shared with Other Modules

- **Stockly**: Product inventory and pricing
- **Msgly**: Potentially shared messaging (future)
- **Teamly**: Delivery assignments (internal)

## Technical Notes

### Library Dependencies

- Next.js 16 (App Router)
- Supabase (auth + database)
- Tailwind CSS (styling)
- date-fns (date utilities)
- lucide-react (icons)
- TypeScript (type safety)

### Color Scheme

Portal uses **pink/magenta** as primary color:

- Primary: `#EC4899` (pink-500)
- Hover: Lighter pink variations
- Used for active states, highlights

### Responsive Design

Mobile-first approach:

- Base styles for mobile
- `md:` prefix for tablet (768px+)
- `lg:` prefix for desktop (1024px+)
- `xl:` prefix for large screens (1280px+)

## Development Notes

### Local Testing

To test customer portal locally:

1. Create test customer in `planly_customers`
2. Use email from Supabase auth
3. Set `is_active = true`
4. Navigate to `/customer/login`

### Admin Preview

To test as admin:

1. Login as platform admin or owner
2. Navigate to `/customer/dashboard`
3. Select customer from dropdown
4. Browse portal as that customer
5. Click "Back to Planly" to exit

### Data Seeding

Create test data:

- Customers in `planly_customers`
- Products in `planly_products`
- Pricing in `planly_customer_pricing`
- Test orders for history
