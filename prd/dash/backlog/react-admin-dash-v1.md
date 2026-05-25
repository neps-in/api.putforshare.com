# React Admin Based - Seller Dashboard - dash v1

## General

1. Delete - Soft delete & Restore [ ]

## Address

1. Delete - Soft delete & Restore [ ]
2. View - Show component - Restore - show Restore btn for deleted items at the bottom.

## Logistics > Packages /my/packages/

1. Delete - Soft delete & Restore [ ]
2. View - Show component - Restore - show Restore btn for deleted items at the bottom.

## Logistics > Pickup Request - /my/pickups/

#### Validations to be done

1.  Ensure pickup_scheduled_for is greater than pickup_created_at or pickup last updated

scheduled date must be atleast one day after the date of creation(today). Please contact support phone number in that case immediately to prioritize your pickup.'

priority_pickup - boolean field if true it is a priority pickup ignore
the validation and do the pickup.

2.  from_user and to_user should not be same or equal

3.  from_address and to_address should not be same else
    raise validation error.

4.  Make sure pickup req has at least one package

    ```py
    if self.no_of_packages <= 0:
    raise ValidationError({
    'no_of_packages': 'Make sure you are sending at least one package.'
    })

    def save(self, *args, **kwargs):
            # Run full_clean before saving to ensure validations are applied
            self.full_clean()
            super().save(*args, \*\*kwargs)

    ```
