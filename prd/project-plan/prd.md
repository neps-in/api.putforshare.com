# Product Requirements Document: Pre-Owned Gadgets Marketplace

## CONTENTS
1. [Abstract](#abstract)
2. [Business Objectives](#business-objectives)
3. [KPI](#kpi)
4. [Success Criteria](#success-criteria)
5. [User Journeys](#user-journeys)
6. [Scenarios](#scenarios)
7. [User Flow](#user-flow)
8. [Functional Requirements](#functional-requirements)
9. [Model Requirements](#model-requirements)
10. [Data Requirements](#data-requirements)
11. [Prompt Requirements](#prompt-requirements)
12. [Testing & Measurement](#testing--measurement)
13. [Risks & Mitigations](#risks--mitigations)
14. [Costs](#costs)
15. [Assumptions & Dependencies](#assumptions--dependencies)
16. [Compliance/Privacy/Legal](#complianceprivacylegal)
17. [GTM/Rollout Plan](#gtmrollout-plan)

---

## 📝 Abstract

A mobile-responsive web marketplace connecting budget-conscious buyers with sellers of pre-owned gadgets and electronics in India. The platform enables individual sellers to declutter and earn income by inventory working gadgets at below-retail prices, while buyers discover affordable electronics through powerful search capabilities. V1 focuses on local, in-person transactions with escrow payment protection, email verification for sellers, and admin-managed dispute resolution. Built with Django REST Framework backend, PostgreSQL database, and React frontend.

**Purpose:** Make quality electronics accessible at affordable prices while creating a trusted marketplace for pre-owned gadgets.

**Rationale:** New gadgets are expensive. This platform solves affordability by connecting buyers directly with sellers of working, pre-owned items at significantly lower prices than market retail.

---

## 🎯 Business Objectives

- **Enable affordable access to technology** by creating a trusted marketplace for pre-owned gadgets priced below retail
- **Build supply-side liquidity** by making it easy for individuals to monetize unused electronics through simple inventory and secure payments
- **Establish marketplace trust** through escrow payments, email verification, and admin oversight to reduce fraud and build buyer confidence
- **Capture local transaction demand** by facilitating safe, in-person exchanges without complex shipping logistics in V1
- **Create sustainable growth engine** through repeat buyers finding quality deals and motivated sellers earning consistent income

---

## 📊 KPI

| GOAL | METRIC | TARGET (8-12 weeks) | QUESTION |
|------|--------|---------------------|----------|
| Supply Growth | Active Inventorys | 1,000 | Are we attracting enough sellers to build inventory? |
| Transaction Volume | Completed Transactions | 100 | Is the marketplace converting browsers into buyers? |
| Buyer Retention | D7 Repeat Rate | 1% | Are buyers coming back for second purchases? |

---

## 🏆 Success Criteria

**Quantitative:**
- Achieve 1,000 active inventorys within 8-12 weeks of launch
- Complete 100 successful transactions with escrow payment releases
- Reach 1% buyer repeat purchase rate (buyers making 2+ purchases)
- Maintain <5% dispute rate on completed transactions

**Qualitative:**
- Positive beta user feedback on trust and ease of use
- Sellers report simple inventory process and timely payment receipt
- Buyers find relevant gadgets through search within 3 queries
- Zero critical security or payment incidents during beta period

---

## 🚶‍♀️ User Journeys

### Primary Journey: Budget-Conscious Buyer (Ravi)

Ravi is a college student looking for a reliable laptop under ₹20,000. He visits the marketplace, searches for "laptop under 20000", filters by "Good" condition, and browses inventorys sorted by lowest price. He finds a suitable Dell laptop listed at ₹18,500 (marked down from ₹25,000). After viewing photos and description, he completes the purchase. Payment goes to escrow. He contacts the seller via provided contact info, arranges a meetup at a safe public location, inspects the laptop, and completes the exchange. The admin releases payment to the seller after verification. Ravi returns two weeks later to search for a wireless mouse.

### Secondary Journey: Decluttering Seller (Priya)

Priya wants to sell her old iPhone 12 before upgrading. She signs up with email verification, logs in, and completes her seller profile including bank details (account number, IFSC code). She creates a inventory: uploads 4 photos, titles it "iPhone 12 128GB - Excellent Condition", writes a detailed description, sets marked price at ₹35,000 and offer price at ₹28,000, selects "Like New" condition and "Phones" category. Within 3 days, a buyer purchases it. After meeting the buyer and completing the exchange, she notifies the admin. Payment is released to her bank account within 24 hours.

---

## 📖 Scenarios

**Buyer Scenarios:**
- Search for specific gadget model and find it within top 5 results
- Filter inventorys by price range to stay within budget
- View multiple photos and detailed condition description before deciding
- Complete purchase with confidence knowing payment is held in escrow
- Coordinate meetup with seller using provided contact information
- Browse active inventorys without seeing sold-out items

**Seller Scenarios:**
- Complete signup and email verification to establish trust
- Add comprehensive profile with bank details for payment receipt
- List gadget with multiple photos showing actual condition
- Show competitive pricing with marked price vs. offer price
- Edit or update inventory details if item condition or price changes
- Receive payment directly to bank account after successful transaction

**Admin Scenarios:**
- Review and release escrow payments after transaction verification
- Handle buyer-seller disputes through manual intervention
- Add new product categories as marketplace expands
- Monitor inventory quality and user activity for fraud detection
- Manage user accounts and moderate content

---

## 🕹️ User Flow

### Buyer Happy Path
1. Land on homepage → Browse featured/recent inventorys
2. Use search bar (keyword: "iPhone 13") → View results sorted by price
3. Apply filters (price range, condition) → Refine results
4. Click inventory → View photos, description, marked price, offer price, condition, seller info
5. Click "Buy Now" → Sign up/Login (Email+Password or Google OAuth)
6. Complete payment → Funds held in escrow
7. Receive seller contact info → Arrange meetup offline
8. Complete exchange → Admin releases payment to seller

### Seller Happy Path
1. Land on homepage → Click "Sell Your Gadget"
2. Sign up (Email+Password or Google OAuth) → Verify email
3. Login → Complete profile (name, brand, bank details)
4. Click "Add Inventory" → Upload photos (1-5), enter title, description, marked price, offer price, select condition, select category
5. Submit inventory → Item goes live immediately
6. Buyer purchases → Receive notification with buyer contact
7. Arrange meetup → Complete exchange
8. Notify admin → Payment released to bank account within 24 hours

### Alternative Flows
- **Forgot Password:** Email reset link → User resets password → Login successful
- **Failed Payment:** Payment gateway error → User retries or uses alternative method
- **Edit Inventory:** Seller updates price/description → Changes reflected immediately
- **Dispute:** Buyer/seller reports issue → Admin investigates → Resolution (refund or payment release)

---

## 🧰 Functional Requirements

### Authentication & User Management

| SECTION | SUB-SECTION | USER STORY & EXPECTED BEHAVIORS | SCREENS |
|---------|-------------|----------------------------------|---------|
| Signup | Email | **Story:** As a new user, I want to create an account with email and password so I can access the marketplace.<br>**Behaviors:** Email validation, password strength requirements (min 8 chars, 1 uppercase, 1 number), email verification link sent, account inactive until verified | Signup form, Email verification success |
| Signup | Google OAuth | **Story:** As a new user, I want to sign up with my Google account for quick access.<br>**Behaviors:** OAuth redirect to Google, permission consent, auto-create account, email pre-verified, redirect to profile completion | Google OAuth consent, Profile setup |
| Login | Email | **Story:** As a returning user, I want to log in with my email and password.<br>**Behaviors:** Email and password validation, show error for unverified email, redirect to dashboard on success | Login form, Dashboard |
| Login | Google OAuth | **Story:** As a returning user, I want to log in with my Google account quickly.<br>**Behaviors:** OAuth redirect, auto-login if previously connected, redirect to dashboard | Google OAuth, Dashboard |
| Forgot Password | - | **Story:** As a user who forgot my password, I want to reset it via email.<br>**Behaviors:** Enter email, send reset link (valid 24hrs), click link to reset page, enter new password, confirm and redirect to login | Forgot password form, Reset link email, Password reset form |

### Seller Profile Management

**User Story:** As a seller, I want to maintain a complete profile with payment details so buyers trust me and I can receive payments.

**Expected Behaviors:**
- Profile fields: Full Name (required), Brand Name (optional), Nickname (optional), Bank Account Number (required, encrypted), IFSC Code (required, validated format), Bank Name (required), Branch Address (optional)
- Bank details encrypted at rest
- Edit profile anytime
- Profile completion indicator (encourage 100% completion)
- Consent checkbox for storing bank details (required before saving)

**Screens:** Profile setup form, Profile view/edit page

### Product Inventory Management

**User Story:** As a seller, I want to create detailed inventorys with photos and pricing so buyers have all information needed to make a purchase decision.

**Expected Behaviors:**
- Upload 1-5 photos (JPG, PNG, WEBP only, max 100MB each)
- Photo preview before upload
- Fields: Title (required, max 100 chars), Description (required, max 1000 chars), Marked Price (required, INR), Offer Price (required, INR, must be ≤ Marked Price), Condition dropdown (Like New, Good, Fair - required), Category dropdown (dynamic, required)
- Auto-calculate discount percentage: ((Marked Price - Offer Price) / Marked Price) × 100
- Save as draft or publish immediately
- Edit inventory: All fields editable except photos (delete and re-upload)
- Mark as sold (removes from search results)
- Image storage: AWS S3 with CDN

**Screens:** Create inventory form, Edit inventory form, Inventory preview, My inventorys dashboard

### Search & Browse

**User Story:** As a buyer, I want to search for gadgets by keyword and filter results so I can find exactly what I need within my budget.

**Expected Behaviors:**
- Search bar: Full-text search on title + description (PostgreSQL full-text search)
- Auto-hide sold items from all results
- Sort options: Price Low-to-High (default), Price High-to-Low, Newest First
- Filter options: Price range slider (₹0 - ₹100,000), Condition checkboxes (Like New, Good, Fair), Category checkboxes (dynamic based on available categories)
- Search results: Grid view with thumbnail, title, offer price, marked price (strikethrough), discount %, condition badge
- Pagination: 20 items per page
- Empty state: "No results found" with suggestion to modify search

**Screens:** Homepage with search, Search results page, Filter sidebar

### Product Detail Page

**User Story:** As a buyer, I want to view complete product details including all photos and seller info so I can decide if I want to purchase.

**Expected Behaviors:**
- Image gallery: Thumbnail strip + large preview, click to zoom
- Product info: Title, Description, Offer Price (prominent), Marked Price (strikethrough), Discount % badge, Condition badge, Category tag
- Seller info: Brand name or nickname, "Verified Email" badge
- "Buy Now" button (prominent CTA)
- Breadcrumb navigation: Home > Category > Product Title
- Related inventorys: Show 4 similar items (same category, similar price range)

**Screens:** Product detail page

### Payment & Escrow

**User Story:** As a buyer, I want to pay securely knowing my money is protected until I receive the item.

**Expected Behaviors:**
- Click "Buy Now" → Redirect to payment gateway (Razorpay or equivalent)
- Payment options: UPI, Cards, Net Banking, Wallets
- Payment success → Funds moved to escrow account (not seller account)
- Generate transaction ID
- Send confirmation emails to buyer and seller with contact info exchange
- Buyer receives: Seller name, phone number (if provided)
- Seller receives: Buyer name, phone number (if provided)
- Transaction status: "Payment in Escrow - Awaiting Admin Release"

**User Story:** As a seller, I want to receive payment in my bank account after successful transaction.

**Expected Behaviors:**
- Admin dashboard shows "Pending Release" transactions
- Admin reviews transaction, confirms with buyer/seller if needed
- Admin clicks "Release Payment" → Escrow transfers to seller's bank account
- Payment typically released within 24 hours of transaction completion
- Seller receives payment confirmation email with transaction details

**Screens:** Payment gateway integration, Payment success page, Transaction history (buyer & seller), Admin escrow management dashboard

### Category Management (Admin)

**User Story:** As a super admin, I want to add and manage product categories so the marketplace can expand to new gadget types.

**Expected Behaviors:**
- Admin panel: View all categories in table
- Add category: Category name (required, unique), Description (optional), Icon/image (optional)
- Edit category: Update name or description
- Delete category: Only if no active inventorys use it (show warning + count)
- Categories appear in seller inventory form and buyer filter dropdown
- Default categories: Phones, Laptops, Tablets, Accessories, Other

**Screens:** Admin category management page

### Dispute Resolution (Admin)

**User Story:** As an admin, I want to handle disputes between buyers and sellers so transactions can be resolved fairly.

**Expected Behaviors:**
- Buyer or seller can flag transaction as "Disputed"
- Dispute form: Reason dropdown (Item not as described, Payment issue, Meetup failed, Other), Description (required)
- Admin receives dispute notification
- Admin dashboard shows all disputes with status: New, In Review, Resolved
- Admin actions: Contact buyer/seller via email, Request additional info, Refund to buyer (from escrow), Release to seller, Partial refund
- Resolution notes logged in transaction history
- Email notifications sent to both parties on resolution

**Screens:** Dispute flag form (buyer/seller), Admin dispute management dashboard

---

## 📐 Model Requirements

**Not applicable.** This product does not utilize AI/ML models in V1. Search is powered by PostgreSQL full-text search capabilities. Future versions may incorporate ML for recommendations, fraud detection, or dynamic pricing suggestions.

---

## 🧮 Data Requirements

### User Data
- **Storage:** PostgreSQL database, India-based hosting (AWS Mumbai or equivalent region)
- **Retention:** Indefinite unless user requests account deletion (GDPR-style right to be forgotten)
- **PII Protection:** Bank details encrypted at rest (AES-256), password hashing (bcrypt), HTTPS enforced for all connections
- **Access Controls:** Role-based access (Buyer, Seller, Admin), users can only view/edit their own data, admins have read-only access to support disputes

### Product Inventory Data
- **Storage:** PostgreSQL for metadata, AWS S3 for images
- **Freshness:** Real-time updates, sold items immediately hidden from search
- **Retention:** Active inventorys indefinite, sold inventorys archived after 90 days (retain for analytics)
- **Image CDN:** CloudFront or equivalent for fast image delivery

### Transaction Data
- **Storage:** PostgreSQL with transaction log table for audit trail
- **Retention:** 7 years (Indian tax and legal compliance)
- **Audit Trail:** All status changes logged (payment received, escrow held, payment released, disputed, resolved)
- **Access:** Buyer and seller can view their own transactions, admin full access for dispute resolution

### Sample Data for Launch
- **Purpose:** Populate marketplace for beta testing and demo
- **Quantity:** 50-100 sample gadget inventorys across all categories
- **Coverage:** Price range ₹500 - ₹80,000, all condition types, realistic photos and descriptions
- **Sample Users:** 10-15 buyer accounts, 5-10 seller accounts with verified emails

---

## 💬 Prompt Requirements

**Not applicable.** This product does not utilize LLM/AI prompting in V1. All content is user-generated. Future versions may incorporate AI for inventory description enhancement, fraud detection, or customer support chatbots.

---

## 🧪 Testing & Measurement

### Pre-Launch Testing

**Functional Testing:**
- **Auth flows:** Email signup with verification, Google OAuth, login, logout, password reset
- **Seller flows:** Profile completion, inventory creation (all field validations), photo upload (size/format limits), edit inventory, mark as sold
- **Buyer flows:** Search (keyword accuracy), filter (price range, condition, category), sort, product detail view, payment integration
- **Payment:** End-to-end payment with test gateway, escrow holding, admin release, bank transfer simulation
- **Admin:** Category CRUD, escrow management, dispute handling
- **Edge cases:** Duplicate inventorys, invalid bank details, payment failures, concurrent edits, SQL injection attempts

**Performance Testing:**
- Search response time: <500ms for 1,000 inventorys
- Page load: <2s on 4G connection
- Image load: Progressive loading with thumbnails
- Concurrent users: Support 100 simultaneous users without degradation

**Security Testing:**
- Penetration testing for auth bypass attempts
- SQL injection and XSS vulnerability scans
- Bank detail encryption verification
- HTTPS enforcement and certificate validation
- Rate limiting on API endpoints (prevent scraping)

**Browser Compatibility:**
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile responsive: iOS Safari, Android Chrome

### Post-Launch Monitoring

**A/B Testing (Future):**
- V1 ships with single experience, no A/B tests
- Post-launch: Test search result ordering, pricing display format, CTA button copy

**Live Performance Tracking:**
- **Uptime:** 99.5% target, monitor via UptimeRobot or equivalent
- **Error rate:** <1% of requests, alert if >2%
- **Payment success rate:** >95%, alert if drops below 90%
- **Search quality:** Track zero-result searches, investigate patterns
- **Page speed:** Monitor with Google Analytics, target <3s average load time

**Alerting:**
- Payment gateway downtime: Immediate alert
- Database connection failures: Immediate alert
- Spike in dispute reports: Daily summary
- Fraud pattern detection: Weekly review (manual in V1)

**Analytics Tracking:**
- Google Analytics 4 implementation
- Track: Signups, inventorys created, searches performed, search-to-view rate, view-to-purchase rate, repeat purchase rate
- Funnel: Homepage → Search → Product View → Purchase → Transaction Complete
- Identify drop-off points for optimization

---

## ⚠️ Risks & Mitigations

| RISK | LIKELIHOOD | IMPACT | MITIGATION |
|------|------------|---------|------------|
| **Fraud/Scams:** Fake inventorys or payment disputes destroy buyer trust | High | Critical | • Email verification for all sellers<br>• Escrow payment (not direct transfer)<br>• Admin review before payment release<br>• Dispute resolution process<br>• Future: Seller ratings, inventory review queue |
| **Cold Start Problem:** No sellers = empty marketplace | High | Critical | • Pre-populate with 50-100 curated sample inventorys<br>• Beta launch with personal network (guaranteed initial sellers)<br>• Seller incentives: Featured inventorys for early adopters<br>• Community targeting: College campuses, tech groups |
| **Poor Search Quality:** Buyers can't find relevant items | Medium | High | • PostgreSQL full-text search with ranking<br>• Test with 100+ inventorys before launch<br>• Track zero-result searches and iterate<br>• Plan migration to Elasticsearch if scale demands |
| **Payment/Escrow Issues:** Failed payments or delayed releases frustrate users | Medium | High | • Use established payment gateway (Razorpay)<br>• Clear SLA: Payment released within 24 hours<br>• Automated email notifications at each status change<br>• Admin escalation process for delays |
| **Low Buyer Trust:** Perception of risk in pre-owned marketplace | Medium | High | • "Verified Email" badges for sellers<br>• Escrow messaging in all payment flows<br>• Clear dispute resolution policy (visible on all pages)<br>• Encourage local meetups in public places (safety tips) |
| **Technical Scalability:** Database/storage limits at high volume | Low | Medium | • AWS infrastructure with auto-scaling capability<br>• S3 for unlimited image storage<br>• Monitor database performance, plan sharding if needed<br>• CDN for image delivery reduces server load |
| **Regulatory Compliance:** Non-compliance with RBI payment regulations | Low | Critical | • Legal review of escrow model before launch<br>• Partner with licensed payment gateway<br>• Document fund flow and audit trail<br>• Periodic compliance audits |

---

## 💰 Costs

### Development Costs (One-Time)

**Personnel (Estimated Timeline: 8-10 weeks):**
- Backend Developer (Django REST): 6 weeks @ market rate
- Frontend Developer (React): 6 weeks @ market rate
- UI/UX Designer: 2 weeks @ market rate
- QA/Testing: 2 weeks @ market rate
- DevOps Setup: 1 week @ market rate

**Assumption:** Using existing team or freelancers. Costs vary by region (₹50,000 - ₹3,00,000 total estimate for India-based team).

**Third-Party Services Setup:**
- Payment Gateway Integration: Razorpay setup (free, 2% transaction fee applies post-launch)
- Email Service: AWS SES + django-anymail setup (free tier)
- Domain Registration: ₹500 - ₹1,000/year
- SSL Certificate: Free (Let's Encrypt)

**Total Development Cost Estimate:** ₹50,000 - ₹3,00,000 (highly variable based on team structure)

### Operational Costs (Monthly)

**Infrastructure (Low-Cost Options):**
- **Hosting:** AWS Lightsail or DigitalOcean Droplet: ₹500 - ₹2,000/month (scales with traffic)
- **Database:** PostgreSQL on same server (V1), upgrade to RDS if needed: ₹0 - ₹3,000/month
- **Storage:** AWS S3 for images: ₹500 - ₹2,000/month (100GB estimate, grows with inventorys)
- **CDN:** CloudFront: ₹300 - ₹1,000/month (for image delivery)
- **Email Service:**
- AWS SES via django-anymail: First 62,000 emails/month FREE (when sending from EC2)
- If not from EC2: $0.10 per 1,000 emails
- Estimated: ₹0 - ₹300/month (well within free tier for beta/V1)

**Payment Processing:**
- Razorpay: 2% per transaction (₹100 transaction = ₹2 fee, deducted from seller payment or added to buyer total)
- Estimated: ₹200/month (100 transactions × ₹100 avg × 2%)

**Monitoring & Analytics:**
- Google Analytics: Free
- Uptime Monitoring: Free tier (UptimeRobot)
- Error Tracking (Sentry): Free tier

**Total Monthly Operational Cost:** ₹1,500 - ₹8,700/month

**Cost Optimization Strategies:**
- Start with smallest server, scale up based on traffic
- Use AWS free tier for first 12 months if eligible
- Image compression before S3 upload (reduces storage costs)
- Consider Railway.app or Render.com for even lower hosting costs (₹300-500/month)

---

## 🔗 Assumptions & Dependencies

### Assumptions

1. **Market Assumption:** Sufficient demand exists for pre-owned gadgets in target geography (India)
2. **Transaction Model:** V1 buyers and sellers are comfortable with local, in-person exchanges (no shipping)
3. **Trust Model:** Email verification + escrow is sufficient trust signal for beta launch
4. **Payment Timeline:** Sellers accept 24-hour payment release window as reasonable
5. **Admin Bandwidth:** Manual escrow release and dispute resolution is feasible at <100 transactions/month
6. **Search Scale:** PostgreSQL full-text search is adequate for up to 10,000 inventorys
7. **Storage Growth:** 100 inventorys/week average, each with 3 photos × 5MB = 1.5GB/week growth rate
8. **Browser Usage:** Target users have modern browsers (Chrome, Firefox, Safari, Edge)
9. **Mobile Usage:** 60%+ users access via mobile, desktop experience is secondary
10. **Beta Network:** Founder has access to 50+ potential beta users (buyers and sellers)
11. **Sample Data:** Team can create realistic sample inventorys for marketplace seeding
12. **Legal Compliance:** Current escrow model complies with Indian payment regulations (requires legal validation)
13. **Geographic Focus:** Initial launch targets one city/region for concentrated growth
14. **Category Growth:** 5 default categories sufficient for first 6 months

### Dependencies

**External Services:**
- Payment gateway (Razorpay or equivalent) account active and integrated
- AWS account with S3 bucket configured for India region
- AWS SES configured with verified sender and production access
- django-anymail installed for email delivery via SES
- Domain registration and DNS configuration
- Google OAuth credentials for social login

**Internal Resources:**
- Development team availability for 8-10 week build timeline
- Legal review of Terms of Service, Privacy Policy, and escrow model
- Admin availability for daily escrow release and dispute management (1-2 hours/day)
- Marketing/community access for beta user recruitment

**Content & Legal:**
- Privacy Policy drafted and reviewed
- Terms of Service drafted and reviewed
- Refund/Dispute Policy documented
- Consent forms for bank detail storage
- Safety guidelines for local meetups

**Technical:**
- India-based hosting infrastructure provisioned
- Database backup and disaster recovery plan
- SSL certificate installed and auto-renewal configured
- Monitoring and alerting configured before launch

---

## 🔒 Compliance/Privacy/Legal

### Regulatory Compliance

**Indian Payment Regulations:**
- Escrow model must comply with RBI guidelines for marketplace facilitators
- Payment gateway partner (Razorpay) handles PCI-DSS compliance
- Transaction records retained for 7 years per Indian tax laws
- GST applicability: Consult CA for marketplace commission structure (if applicable in future)

**Action Required:** Legal review of escrow fund flow model before launch to ensure RBI compliance.

### Data Protection & Privacy

**Data Governance:**
- **Storage Location:** All user data stored on India-based servers (AWS Mumbai or equivalent)
- **Encryption:** Bank details encrypted at rest (AES-256), all connections via HTTPS (TLS 1.2+)
- **Access Controls:** Role-based permissions, admin access logged and audited
- **User Rights:** Users can request data export or account deletion (GDPR-style compliance)

**Privacy Policy Requirements:**
- **Consent:** Explicit consent checkbox before collecting bank details
- **Disclosure:** Clearly state what data is collected (email, name, bank details, photos, transaction history)
- **Usage:** Explain how data is used (facilitate transactions, payment processing, dispute resolution)
- **Sharing:** Contact info shared between buyer/seller post-purchase, no third-party marketing sharing
- **Retention:** User data retained indefinitely unless deletion requested, transaction data 7 years
- **Cookies:** Disclose analytics cookies (Google Analytics), provide opt-out

**Action Required:** Draft and publish Privacy Policy before launch, link prominently in footer and signup flow.

### Terms of Service

**Key Clauses:**
- **User Conduct:** Prohibit fake inventorys, fraud, harassment, illegal goods
- **Transaction Terms:** Escrow holding period, admin release timeline (24 hours), dispute process
- **Liability:** Platform is facilitator only, not responsible for item condition or user disputes (best-effort resolution)
- **Fees:** Payment gateway fees disclosed (2% transaction fee), no platform commission in V1
- **Termination:** Platform can suspend/ban users violating terms
- **Governing Law:** Indian jurisdiction for dispute resolution

**Action Required:** Draft and publish Terms of Service before launch, require acceptance during signup.

### Intellectual Property

**User Content:**
- Users retain copyright on photos and descriptions
- Users grant platform license to display content for marketplace purposes
- Platform can remove infringing content (counterfeit goods, trademark violations)

### Risk Mitigation

**Fraud Prevention:**
- Email verification reduces fake accounts
- Admin review before payment release catches suspicious transactions
- Dispute process handles bad actors

**Safety Guidelines:**
- Publish safety tips for local meetups (public places, daytime, bring friend)
- Recommend buyers inspect item before exchange
- Encourage reporting suspicious inventorys or users

**Action Required:** Create and publish Safety Guidelines page before launch.

---

## 📣 GTM/Rollout Plan

### Milestones

**Week 1-2: Foundation**
- Finalize tech stack setup (Django, PostgreSQL, React scaffolding)
- Design system and UI mockups approved
- Payment gateway sandbox integration complete

**Week 3-4: Core Development**
- Auth flows (email, Google OAuth, password reset)
- Seller profile and inventory management
- Search and browse functionality

**Week 5-6: Transaction Features**
- Payment integration (test mode)
- Escrow logic and admin dashboard
- Buyer purchase flow end-to-end

**Week 7-8: Polish & Testing**
- UI/UX refinement based on internal testing
- Security audit and penetration testing
- Sample data creation (50-100 inventorys)
- Legal docs finalized (Terms, Privacy, Safety)

**Week 9: Beta Prep**
- Deploy to production environment
- Payment gateway live mode activated
- Analytics and monitoring configured
- Beta user recruitment from personal network

**Week 10: Beta Launch**
- Soft launch to 20-30 beta users (friends, family, trusted community)
- Daily monitoring and bug fixes
- Gather qualitative feedback via surveys
- Admin actively manages escrow releases

**Week 11-12: Iterate & Scale**
- Incorporate beta feedback (UI tweaks, flow improvements)
- Monitor KPIs: inventorys, transactions, repeat rate
- Expand to broader community if metrics positive

### Launch Strategy

**Phase 1: Private Beta (Week 10)**
- **Audience:** Personal network (friends, family, college community, tech groups)
- **Size:** 20-30 users (mix of buyers and sellers)
- **Goal:** Validate end-to-end flow, gather feedback, achieve first 10 transactions
- **Channels:** Direct outreach (WhatsApp, email), invite-only access
- **Incentives:** Early adopters get featured inventorys, founder support for onboarding

**Phase 2: Community Beta (Week 11-14)**
- **Audience:** Expand to specific community (e.g., college campus, tech Slack/Discord groups, local Facebook groups)
- **Size:** 100-200 users
- **Goal:** Achieve 50+ inventorys, 30+ transactions, validate product-market fit
- **Channels:** Social media posts (Instagram, Twitter, LinkedIn), community forums, word-of-mouth
- **Positioning:** "Affordable gadgets from people you trust - local, verified, secure"

**Phase 3: City Launch (Week 15-20)**
- **Audience:** Broader city/region (e.g., Bangalore, Mumbai, Delhi)
- **Size:** 500-1,000 users
- **Goal:** Hit KPI targets (1,000 inventorys, 100 transactions, 1% repeat rate)
- **Channels:** Paid social ads (Instagram, Facebook), influencer partnerships, SEO optimization, PR outreach
- **Budget:** ₹10,000 - ₹30,000 for ads (testing phase)

### Phased Rollout

**Beta Features (Week 10-12):**
- Core flows only: Auth, inventory, search, payment, escrow
- Manual admin processes (escrow release, dispute resolution)
- Limited categories (Phones, Laptops, Tablets, Accessories, Other)
- Single geography focus (one city)

**Post-Beta Enhancements (Week 13+, based on feedback):**
- Seller ratings and reviews (if fraud concerns arise)
- Automated escrow release after X days (reduce admin burden)
- Shipping integration (if user demand is high)
- Buyer-seller in-app messaging (if coordination issues surface)
- Advanced search (filters by brand, specifications)
- Recommendation engine (if browsing behavior warrants it)

### Success Checkpoints

**End of Week 10 (Beta Launch):**
- ✅ 20+ active inventorys from beta sellers
- ✅ 5+ completed transactions
- ✅ Zero critical bugs or security incidents
- ✅ Positive qualitative feedback (NPS >7)

**End of Week 12 (Beta Completion):**
- ✅ 100+ active inventorys
- ✅ 20+ completed transactions
- ✅ Repeat purchase by at least 2 buyers
- ✅ <10% dispute rate
- ✅ Decision: Proceed to broader launch or pivot based on feedback

**End of Week 20 (City Launch):**
- ✅ 1,000 active inventorys (KPI target)
- ✅ 100 completed transactions (KPI target)
- ✅ 1% buyer repeat rate (KPI target)
- ✅ 95%+ payment success rate
- ✅ Operational runbook established for admin processes

### Rollback Plan

If critical issues arise (payment failures, security breach, high fraud rate):
1. Pause new signups immediately
2. Email all active users about maintenance window
3. Identify and fix root cause
4. Re-test in staging environment
5. Gradual re-launch with monitoring
6. Communicate resolution and preventive measures to users

---

**END OF PRD**

_Generated: February 2026_
_Version: 1.0 - V1 Scope_
_Next Review: Post-Beta Feedback (Week 12)_
