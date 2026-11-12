# SafeTrade P2P Marketplace (Central Bank Safe-Hold)

> A Peer-to-Peer Safe-Trading Marketplace App inspired by Taobao's high-density discovery design, featuring an integrated **Central Bank Safe-Hold (Escrow)** system, Smart Location & Delivery Reach filtering, In-App Chat with real-time status banners, and an Admin Dispute Resolution Console.

---

## 📱 How to Run & Test

You can test the entire app **right on your computer in your web browser**, on an **Android emulator**, or on your **physical phone via Expo Go**.

### 1. Start the Backend Server
The backend runs on **Node.js + Express + Prisma (SQLite) + Socket.IO**:
```bash
npm run dev:server
```
*(Server will start on `http://localhost:4000` with pre-seeded products, regions, districts, and demo users).*

---

### 2. Test on Your Computer (Instant Web Preview)
Run this command from the root folder:
```bash
npm run web
```
* Press **`F12`** in Chrome/Edge and click the **Mobile Device Toggle** (iPhone / Pixel view) to preview the native mobile phone experience on your computer screen.
* Changes you make in code will reload instantly in less than a second!

---

### 3. Test on Your Real Phone (Via Expo Go over Wi-Fi)
1. Install **Expo Go** from the [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) on your Android phone.
2. Ensure your PC and phone are on the same Wi-Fi network.
3. In your PC terminal, run:
   ```bash
   npm run dev:mobile
   ```
4. Open the Expo Go app on your phone and **scan the QR code** shown in your PC terminal.
5. The full app will open natively on your phone!

---

### 4. Build for the Google Play Market (.aab file)
When you are ready to publish:
1. Run EAS Build:
   ```bash
   npm run build:android
   ```
2. Expo cloud compiles your optimized production Android App Bundle (`.aab`).
3. Download the `.aab` file and upload it directly to your [Google Play Console](https://play.google.com/console) under **Production Releases**.

---

## 🛡️ Core Features Built & Ready to Test

1. **Taobao-Inspired High Density Discovery Feed:**
   * Iconic capsule pill search bar (`border: 2px solid #FF5000`) with dynamic trending query ticker.
   * 2x5 "King Kong" Category Matrix with high-saturation icons.
   * 2-column waterfall / masonry card grid with signature **Taobao 3-tier Price Stack** (`$ 850.00`).
   * Social proof & seller trust counters (`18 Safe Trades`).

2. **Smart Location & Delivery Reach Hierarchy:**
   * 3-Tier Geographic Tree: **Region $\to$ District $\to$ City**.
   * One-tap shortcuts: *"Whole Country"*, *"All Districts in this Region"*, *"All Cities in this District"*.
   * Customers filtering by location only see items available in their area or with seller delivery to their address.
   * Online Products are automatically marked as *Available Everywhere*.

3. **Step-by-Step Listing Builder ("Sell Item"):**
   * Multi-photo support, category selection, and price negotiation tags (*Fixed*, *Negotiable*, *Swap Allowed*).
   * Physical Product vs. Online Product switcher.
   * Contact privacy toggles (Show Phone, Show Email).
   * Interactive Delivery Reach matrix configuration.

4. **In-App Chat with Live Dynamic Status Banner:**
   * **Stage 1 (Grey): Agreeing on Terms** — *"No money deposited yet. Do not hand over the product."*
   * **Stage 2 (Green): Money in Central Safe Account** — *"Customer deposited $850 into Central Account. Safe to deliver the product!"*
   * **Stage 3A (Blue): Trade Completed** — *"Customer confirmed receipt. $850 has been released to Seller."*
   * **Stage 3B (Yellow): Money Withdrawn** — *"Customer withdrew money. Trade cancelled — do not hand over product!"*
   * **Stage 4 (Red): Under Investigation** — *"Report filed. Funds frozen while Admins investigate."*

5. **Customer Money Action Buttons:**
   * **"Send Money to Central Account"** (Locks money in safe hold).
   * **"Product Received"** (Instantly releases funds to seller and marks product *Sold*).
   * **"Withdraw Money"** (Returns funds to customer and sounds urgent alert to seller).

6. **The "Report Problem" & Investigation System:**
   * Structured reason codes (e.g. *Customer withdrew after receiving*, *Seller disappeared*, *Damaged item*).
   * Multi-photo evidence uploader.
   * Immediate freeze on funds in Central Safe Hold or user wallet.

7. **Admin / Moderator Investigation Console:**
   * Accessible by tapping the **"Admin"** badge in the header.
   * Side-by-side case view: Product details, buyer/seller profiles, statement, and uploaded proof photos.
   * Administrative resolution actions: *Disburse to Seller*, *Refund to Buyer*, *Ban Scammer Account*.

8. **Central Bank Wallet & Ledger:**
   * Shows Available Balance, Money in Safe Hold, and Frozen Balance.
   * Top-Up Balance & Withdraw to Bank Card modals.
   * Complete immutable double-entry ledger history.

---

## 🧪 Quick Demo User Switcher
In the top right corner of the header, tap the user pill to switch roles instantly:
* **Alex Vance:** Customer / Buyer (has active wallet balance ready to buy items).
* **Sarah Jenkins:** Verified Seller (has 18 completed safe trades and active listings).
* **Platform Admin:** Dispute Arbitrator (has access to the Moderator Investigation Console).
