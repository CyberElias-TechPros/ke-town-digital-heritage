# MySQL/cPanel Integration Guide

## Overview

The KE Kingdom backend now supports both MongoDB (default) and MySQL. This allows you to deploy to cPanel shared hosting with MySQL databases.

## Switching to MySQL

### 1. Environment Configuration

In `server/.env`, change:

```env
DB_TYPE=mysql  # Change from 'mongo' to 'mysql'
```

Then configure your cPanel MySQL credentials:

```env
# cPanel MySQL settings
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_cpanel_username
MYSQL_PASSWORD=your_cpanel_password
MYSQL_DATABASE=keKingdom
MYSQL_CHARSET=utf8mb4
```

**Getting your cPanel MySQL credentials:**
1. Log into cPanel
2. Go to **MySQL® Databases**
3. Create a database named `keKingdom` (or your preferred name)
4. Create a MySQL user and assign it to the database
5. Note the username and password you set
6. Add them to your `.env` file

### 2. First Startup

When you start the server with `DB_TYPE=mysql`, the system will:
- Connect to your MySQL database
- Automatically create all tables (via `sequelize.sync()`)
- Log: `✅ Connected to MySQL database` and `✅ Database tables synchronized`

No manual schema creation needed.

### 3. Data Compatibility

All data stored in MySQL uses:
- **UUIDs (CHAR(36))** as primary keys — matches MongoDB's ObjectId pattern
- **JSON columns** for flexible document storage (`cart`, `orders`, `notifications`, `items`, etc.)
- **InnoDB engine** (default) with foreign key constraints

This ensures minimal data loss if migrating from MongoDB.

## Important Features

### JSON Array Mutations (`$push`, `$inc`)

Routes that modify nested arrays work automatically:

```javascript
// Add item to cart
await User.findByIdAndUpdate(userId, {
  $push: { cart: { product: productId, quantity: 2 } }
});

// Increment views
await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });
```

The adapter translates these to proper MySQL JSON operations.

### Virtual Fields

Some fields are virtual and map to real columns:

| Virtual | Real Column | Notes |
|---------|-------------|-------|
| `product.name` | `product.title` | For compatibility |
| `product.artisan` | `product.seller` | Aliased |
| `product.stock` | `product.quantity` | Aliased |
| `product.isActive` | derived from `status === 'active'` | Computed |
| `order.totalAmount` | `order.total` | Aliased |

No changes needed in route files.

### Aggregations & Complex Queries

Routes using MongoDB aggregation are converted to:
- **Sequelize aggregate methods** (`sum()`, `avg()`, `count()`)
- **Raw SQL queries** for grouping/date operations
- **In-memory processing** for smaller datasets (e.g., hashtag trends)

These are handled automatically; no route changes required.

## Deploying to cPanel

### Step 1: Upload Files
- Upload the entire project to your cPanel account (e.g., `public_html/ke-kingdom`)
- Ensure `server/` directory and all files are present

### Step 2: Set Up Node.js Application
1. In cPanel, go to **Setup Node.js App**
2. Create a new application:
   - Node.js version: 18.x or higher
   - Application mode: Production
   - Application root: `server`
   - Application URL: your domain/subdomain
   - Startup file: `index.js`
3. Click **Create**

### Step 3: Install Dependencies
```bash
cd ~/server
npm install
```

### Step 4: Configure Environment
1. In your Node.js app settings, add environment variables:
   - `DB_TYPE=mysql`
   - `MYSQL_HOST=localhost`
   - `MYSQL_PORT=3306`
   - `MYSQL_USER=your_cpanel_user`
   - `MYSQL_PASSWORD=your_cpanel_pass`
   - `MYSQL_DATABASE=keKingdom`
   - `PORT=5000` (or your assigned port)
   - `JWT_SECRET=your-secret-here`
   - Other env vars from `.env` as needed
2. Or edit the `.env` file directly in the server directory

### Step 5: Start Application
```bash
npm start
```
Or use cPanel's **Start App** button.

### Step 6: Verify
Visit `https://yourdomain.com/api/health` — should return:
```json
{
  "status": "ok",
  "service": "KE Kingdom API",
  "timestamp": "..."
}
```

## Troubleshooting

### MySQL Connection Refused
- Verify credentials in cPanel MySQL section
- Ensure database exists
- Check that MySQL user has privileges (ALL PRIVILEGES)

### Tables Not Created
The app automatically runs `sequelize.sync()` on startup. Check logs:
- If you see `✅ Database tables synchronized`, tables exist
- Otherwise, check error messages for permission issues

### Slow Queries on JSON Fields
MySQL JSON queries are reasonably fast for moderate data (<100k rows). If performance degrades:
- Consider adding generated columns for frequently queried JSON keys
- Add indexes on JSON fields: `ALTER TABLE products ADD INDEX idx_seller ((JSON_UNQUOTE(seller)))`
- Normalize heavily queried nested data into separate tables

### Production Migrations
`sequelize.sync()` is fine for development. For production, consider:
- Using Sequelize CLI migrations (`npx sequelize-cli init`)
- Creating explicit migration files for schema changes
- Running `sequelize.sync({ force: false })` to prevent accidental drops

## Switching Back to MongoDB

Just change `DB_TYPE=mongo` and restart. All code remains the same.

## Architecture Notes

- `server/models/` contains wrapper files that export either Mongoose or Sequelize models based on `DB_TYPE`
- Routes import from `../models/ModelName` and remain unchanged
- Two adapters: `adapters/mongoAdapter.js` and `adapters/mysqlAdapter.js` handle socket auth
- All MongoDB-specific operators are converted in `models/sequelize/index.js` Query classes

## Support

For issues:
1. Check server logs for specific error messages
2. Verify `.env` configuration matches cPanel credentials
3. Ensure MySQL version is 5.7+ (JSON support required)
4. Test locally first with MySQL installed

---

Last updated: 2025-04-20
