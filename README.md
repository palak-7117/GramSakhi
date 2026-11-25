# GramSakhi – PHP + MySQL backend (XAMPP)

```
gramsakhi/
├─ index.html        the website (Hindi / English, light theme)
├─ database.sql      tables + demo data
├─ api/config.php    database settings
├─ api/index.php     the whole backend (JSON API)
└─ uploads/          product photos are saved here
```

## Set up (about 5 minutes)

1. Install **XAMPP** (PHP 8.1 or newer) and open the XAMPP Control Panel → **Start Apache** and **Start MySQL**.
2. Copy the whole `gramsakhi` folder into XAMPP's `htdocs` folder  
   (Windows: `C:\xampp\htdocs\` · Linux: `/opt/lampp/htdocs/` · Mac: `/Applications/XAMPP/htdocs/`).
3. Open **http://localhost/phpmyadmin** → *Import* → choose `database.sql` → *Go*. This creates the `gramsakhi` database.
4. Open **http://localhost/gramsakhi/** – the site loads its products and stores from MySQL.
5. Demo seller logins (PIN `1234`): phone `9999999999` (SHG group) or `8888888888` (individual).

Do not open `index.html` by double-clicking it – PHP only runs when the page comes through `http://localhost/...`.

If you gave MySQL a password, put it in `api/config.php` (`DB_PASS`).  
On Linux/Mac make the photo folder writable: `chmod 775 uploads`.

## How the five features map to the backend

| Feature | Where |
|---|---|
| Easy SHG registration | `register` – phone + 4-digit PIN (stored as a bcrypt hash), group members saved in `members` |
| Individual and group stores | `sellers` + `members` tables; store pages come from `bootstrap` |
| Voice listing in Hindi | the browser turns speech into text; `product_add` saves the product and photo |
| Direct ordering, clear payments | `order_create` – the server reads prices from the database, checks and reduces stock in one transaction, and keeps no commission; the customer pays the seller's UPI directly or cash on delivery |
| QR identity and stories | the QR holds the store/product link (`#store/1`, `#p/3`); the story is read from the database |

## API (all under `api/index.php?a=…`)

GET: `bootstrap`, `my_orders`, `my_reviews`  
POST (JSON): `register`, `login`, `logout`, `product_add`, `product_stock`, `product_delete`, `order_create`, `order_status`, `member_add`, `review_add`, `message_add`

## Good to know

- **Customers have no login.** Their browser gets a random cookie that links their orders and reviews, so "My orders" shows orders placed from that browser. A review is only accepted for a product whose order the seller marked *delivered*.
- **Sellers only receive their own orders.** Customer phone and address are never sent to the public pages.
- **QR codes on a phone:** the QR contains the address you opened the site with. To scan from a phone on the same Wi-Fi, open the site as `http://<your-PC-IP>/gramsakhi/` (find the IP with `ipconfig`) before printing QR codes, and allow Apache in the firewall.
- "Contact us" messages are stored in the `messages` table – read them in phpMyAdmin.

## Before real use

- Delete the two demo sellers (`sellers` table) and set a MySQL password.
- A 4-digit PIN is easy for women to remember but weak; the server blocks a phone for 15 minutes after 8 wrong tries. Consider OTP login by SMS later.
- Use HTTPS on a real server.
