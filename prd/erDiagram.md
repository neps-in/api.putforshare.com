erDiagram
User ||--o{ Address : has
User ||--o{ Product : sells
User ||--o{ Order : places
User ||--o{ OrderItem : sells
User ||--o{ Cart : owns
User ||--o{ CouponUsage : uses
User ||--o{ Photo : uploads
User ||--o{ Notification : receives
User ||--o{ Notification : acts_as_actor
User ||--|| UserNotificationPreference : preferences
User ||--o{ Shipper : owns
User ||--o{ PickupRequest : owns
User ||--o{ PickupRequest : from_user
User ||--o{ PickupRequest : to_user
User ||--o{ Package : owns

      Address ||--o{ Order : shipping_address
      Address ||--o{ Order : billing_address
      Address ||--o{ PickupRequest : from_address
      Address ||--o{ PickupRequest : to_address

      Category ||--o{ Product : categorizes

      Product ||--o{ CartItem : in_cart
      Product ||--o{ OrderItem : ordered_as
      Product ||--o{ PackageProfile : packaged_as
      Product ||--|| Book : book_details
      Product ||--|| Soap : soap_details

      Author }o--o{ Book : writes
      Publisher ||--o{ Book : publishes

      Cart ||--o{ CartItem : contains
      CartItem }o--|| Product : for_product

      Order ||--o{ OrderItem : contains
      OrderItem }o--|| Product : for_product
      OrderItem }o--|| User : seller

      PaymentGateway ||--o{ Payment : processes
      Order ||--o{ Payment : has
      Payment ||--o{ Refund : has
      Coupon ||--o{ CouponUsage : used_in
      Order ||--o{ CouponUsage : applied_to
      User ||--o{ CouponUsage : applied_by

      PickupRequest ||--o{ Package : includes
      Shipper ||--o{ PickupRequest : ships
      Product ||--o{ PackageProfile : has

      Photo ||--o{ PhotoAttachment : attaches
      Photo }o--|| User : profile_image
      Photo }o--|| Author : author_photo
      Photo }o--|| Publisher : brand_image
      PhotoAttachment }o--|| ContentType : generic_target

      Notification ||--o{ NotificationDelivery : deliveries

Notes:

- Book and Soap use Django multi-table inheritance from Product (1–1 table links).
- PhotoAttachment is a generic relation via ContentType and object_id.
- Tags on Product use taggit and live in external taggit tables (not shown here).
