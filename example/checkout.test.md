<!-- suite
-->

# Checkout Process

This suite contains manual tests for the e-commerce checkout functionality, covering cart management, shipping options, payment processing, and order completion.

<!-- test
priority: high
-->

## Successful Checkout with Valid Payment

A user should be able to complete a checkout process successfully with valid payment information and receive order confirmation.

### Requirements

- Shopping cart must contain at least one item
- Valid payment method (credit card) must be available
- User must have valid shipping and billing addresses
- Payment gateway must be operational

### Steps

- Add at least one item to the shopping cart
  **Expected Result**: Item appears in cart with correct details and pricing
- Navigate to checkout page
  **Expected Result**: Checkout page loads with cart summary displayed
- Enter valid shipping address information
  **Expected Result**: Address fields accept input and validate format
- Enter valid billing address (same as shipping or different)
  **Expected Result**: Billing address fields are populated and validated
- Select shipping method from available options
  **Expected Result**: Shipping cost is calculated and added to total
- Enter valid credit card information (number, expiry, CVV)
  **Expected Result**: Payment fields accept valid card details

<!-- test
priority: high
-->

## Checkout with Invalid Credit Card

The system should reject checkout attempts with invalid credit card information and display appropriate error messages.

I don't need requirements here

### Steps

- Add items to shopping cart and proceed to checkout
  **Expected Result**: Checkout page loads successfully
- Fill in valid shipping and billing addresses
  **Expected Result**: Address information is accepted
- Enter invalid credit card number (e.g., 1234567890123456)
  **Expected Result**: System should validate card number format
- Attempt to place the order
  **Expected Result**: Error message displays indicating invalid card number
- Try with valid card number but invalid CVV (e.g., 12)
  **Expected Result**: Error message displays for invalid CVV format
- Try with valid card number but past expiry date
  **Expected Result**: Error message displays for expired card

<!-- test
priority: medium
-->

## Checkout with Expired Credit Card

The system should prevent checkout completion when an expired credit card is used and notify the user.

### Requirements

- Shopping cart must contain items
- System must validate credit card expiry dates
- Error messaging system must be functional

### Steps

- Add items to cart and navigate to checkout
  **Expected Result**: Checkout process begins normally
- Fill in all required shipping and billing information
  **Expected Result**: Address fields are completed successfully
- Enter valid credit card number and CVV
  **Expected Result**: Card details are accepted initially
- Enter expiry date that is in the past (e.g., 01/2020)
  **Expected Result**: System should flag the expired date
- Attempt to complete the order
  **Expected Result**: Clear error message appears stating card has expired
- Update to valid future expiry date
  **Expected Result**: Error clears and order can proceed

<!-- test
priority: high
-->

## Empty Cart Checkout Prevention

Users should not be able to proceed to checkout with an empty shopping cart.

### Requirements

- Shopping cart functionality must be operational
- Checkout access controls must be implemented
- Appropriate user messaging must be available

### Steps

- Navigate to the website with an empty shopping cart
  **Expected Result**: Cart shows as empty with 0 items
- Attempt to access checkout page directly via URL or button
  **Expected Result**: User is redirected to cart page or prevented from accessing checkout
- Verify appropriate message is displayed
  **Expected Result**: Message indicates cart is empty and items must be added
- Add an item to cart then remove it
  **Expected Result**: Cart returns to empty state
- Try to access checkout again
  **Expected Result**: Access is still prevented with appropriate messaging

<!-- test
priority: medium
-->

## Shipping Address Validation

The checkout process should validate shipping address fields and require all mandatory information.

### Requirements

- Address validation system must be functional
- Required field indicators must be visible
- Form validation must prevent submission with missing data

### Steps

- Add items to cart and proceed to checkout
  **Expected Result**: Checkout page loads with address form
- Attempt to proceed without filling any address fields
  **Expected Result**: Required field errors appear for mandatory fields
- Fill in only the street address field
  **Expected Result**: Other required fields still show validation errors
- Enter invalid postal code format for the selected country
  **Expected Result**: Postal code validation error appears
- Enter all required fields with valid information
  **Expected Result**: Address validation passes and user can proceed
- Test with international address format
  **Expected Result**: System accepts valid international address formats

<!-- test
priority: medium
-->

## Billing Address Different from Shipping

Users should be able to specify a different billing address from the shipping address during checkout.

### Requirements

- Separate billing address option must be available
- Both address forms must be functional and validated
- System must handle two different addresses correctly

### Steps

- Add items to cart and navigate to checkout
  **Expected Result**: Checkout page displays with address options
- Fill in shipping address information
  **Expected Result**: Shipping address fields are completed
- Select option for "Use different billing address"
  **Expected Result**: Separate billing address form appears
- Enter different billing address information
  **Expected Result**: Billing address fields accept different information
- Verify order summary shows both addresses correctly
  **Expected Result**: Both shipping and billing addresses are displayed accurately
- Complete the order
  **Expected Result**: Order processes with both addresses saved correctly

<!-- test
priority: low
-->

## Apply Valid Discount Code

Users should be able to apply valid discount codes during checkout and see the updated total price.

### Requirements

- Discount code system must be operational
- Valid discount codes must exist in the system
- Price calculation must update correctly

### Steps

- Add items to cart and proceed to checkout
  **Expected Result**: Checkout page shows original total price
- Locate discount code entry field
  **Expected Result**: Discount code input field is visible and accessible
- Enter a valid discount code
  **Expected Result**: Code is accepted in the input field
- Click "Apply" or similar button
  **Expected Result**: Discount is applied and total price is recalculated
- Verify discount amount is shown in order summary
  **Expected Result**: Discount line item appears with correct amount
- Complete checkout process
  **Expected Result**: Final order reflects discounted price

<!-- test
priority: low
-->

## Apply Invalid Discount Code

The system should reject invalid discount codes and display an appropriate error message without affecting the order total.

### Requirements

- Discount code validation system must be functional
- Error messaging must be clear and helpful
- Original pricing must remain unchanged for invalid codes

### Steps

- Add items to cart and navigate to checkout
  **Expected Result**: Checkout displays with original pricing
- Enter an invalid or expired discount code
  **Expected Result**: Invalid code is entered in the field
- Attempt to apply the discount code
  **Expected Result**: Error message appears indicating code is invalid
- Verify order total remains unchanged
  **Expected Result**: Original total price is maintained
- Try entering a code with incorrect format
  **Expected Result**: Format validation error appears if applicable
- Clear the invalid code and proceed without discount
  **Expected Result**: Checkout continues normally with original pricing

<!-- test
priority: medium
-->

## Multiple Payment Methods

Users should be able to choose from available payment methods (credit card, PayPal, etc.) during checkout.

### Requirements

- Multiple payment options must be configured and available
- Payment method selection interface must be functional
- Each payment method must have proper integration

### Steps

- Add items to cart and proceed to checkout
  **Expected Result**: Checkout page loads with payment options
- Verify multiple payment methods are displayed
  **Expected Result**: Credit card, PayPal, and other methods are visible
- Select credit card payment method
  **Expected Result**: Credit card form fields appear
- Switch to PayPal payment method
  **Expected Result**: PayPal integration interface loads
- Switch back to credit card and complete payment details
  **Expected Result**: Credit card form is restored and accepts input
- Complete order with selected payment method
  **Expected Result**: Order processes successfully with chosen payment method

<!-- test
priority: medium
-->

## Shipping Options Selection

Users should be able to select from available shipping options and see updated delivery estimates and costs.

### Requirements

- Multiple shipping options must be available
- Shipping cost calculations must be accurate
- Delivery estimates must be displayed

### Steps

- Add items to cart and enter shipping address
  **Expected Result**: Shipping address is accepted and validated
- Navigate to shipping options section
  **Expected Result**: Available shipping methods are displayed with costs
- Select standard shipping option
  **Expected Result**: Standard shipping cost is applied to total
- Review delivery estimate for standard shipping
  **Expected Result**: Estimated delivery date range is shown
- Change to express shipping option
  **Expected Result**: Higher cost is applied and total updates
- Verify express delivery estimate is shorter
  **Expected Result**: Express delivery shows earlier delivery date
- Complete order with selected shipping method
  **Expected Result**: Order summary reflects chosen shipping option and cost

<!-- test
priority: high
-->

## Order Summary Accuracy

The order summary should accurately display all items, quantities, prices, taxes, shipping costs, and total amount.

### Requirements

- Order calculation system must be accurate
- All cost components must be displayed clearly
- Tax calculation must be correct for shipping location

### Steps

- Add multiple items with different quantities to cart
  **Expected Result**: Cart reflects correct items and quantities
- Proceed to checkout and fill in shipping information
  **Expected Result**: Shipping address is entered and validated
- Review order summary section
  **Expected Result**: All items are listed with correct names, quantities, and individual prices
- Verify subtotal calculation
  **Expected Result**: Subtotal equals sum of all item prices × quantities
- Check tax calculation based on shipping address
  **Expected Result**: Tax amount is calculated correctly for the location
- Verify shipping cost is included
  **Expected Result**: Selected shipping method cost is added
- Confirm final total calculation
  **Expected Result**: Total = Subtotal + Tax + Shipping - any discounts

<!-- test
priority: medium
-->

## Guest Checkout

Users should be able to complete checkout as a guest without creating an account.

### Requirements

- Guest checkout option must be available
- Account creation must not be mandatory
- Order completion must work without user registration

### Steps

- Add items to cart without logging in
  **Expected Result**: Items are added to guest cart successfully
- Navigate to checkout page
  **Expected Result**: Checkout options include guest checkout
- Select "Checkout as Guest" option
  **Expected Result**: Guest checkout form is displayed
- Fill in required information (shipping, billing, payment)
  **Expected Result**: All forms accept guest user input
- Complete the checkout process
  **Expected Result**: Order is processed successfully without account creation
- Verify order confirmation is provided
  **Expected Result**: Confirmation page and email are sent to guest email address

<!-- test
priority: low
-->

## Save Payment Information

Registered users should have the option to save payment information for future purchases during checkout.

### Requirements

- User must be logged in to registered account
- Payment information storage must be secure and optional
- Save payment option must be clearly presented

### Steps

- Log in to registered user account
  **Expected Result**: User is authenticated and logged in
- Add items to cart and proceed to checkout
  **Expected Result**: Checkout process begins for registered user
- Enter payment information in checkout form
  **Expected Result**: Payment details are entered successfully
- Locate and check "Save payment information" option
  **Expected Result**: Save option is visible and can be selected
- Complete the order with save option enabled
  **Expected Result**: Order processes and payment info is saved securely
- Start a new order to verify saved payment info
  **Expected Result**: Previously saved payment information is available for selection

<!-- test
priority: medium
-->

## Checkout Session Timeout

The checkout session should handle timeout scenarios appropriately and preserve cart contents when possible.

### Requirements

- Session timeout mechanism must be implemented
- Cart preservation functionality should be available
- User notification about timeout should be clear

### Steps

- Add items to cart and begin checkout process
  **Expected Result**: Checkout session starts normally
- Fill in partial checkout information
  **Expected Result**: Form data is entered and temporarily stored
- Wait for session timeout period to elapse
  **Expected Result**: Session expires after predetermined time
- Attempt to continue with checkout
  **Expected Result**: System detects expired session and responds appropriately
- Verify cart contents are preserved if possible
  **Expected Result**: Items remain in cart after session recovery
- Re-authenticate or restart checkout process
  **Expected Result**: User can resume checkout with preserved cart

<!-- test
priority: high
-->

## Payment Processing Failure

The system should handle payment processing failures gracefully and allow users to retry or use alternative payment methods.

### Requirements

- Payment gateway error handling must be implemented
- Alternative payment options should be available
- User experience during failures should be managed

### Steps

- Add items to cart and proceed to checkout
  **Expected Result**: Normal checkout process begins
- Enter all required information with valid details
  **Expected Result**: All forms are completed successfully
- Simulate payment processing failure (if possible in test environment)
  **Expected Result**: Payment processing fails at gateway level
- Verify appropriate error message is displayed
  **Expected Result**: Clear, user-friendly error message appears
- Check that order information is preserved
  **Expected Result**: Cart contents and form data remain intact
- Retry payment with same method
  **Expected Result**: User can attempt payment again
- Try alternative payment method if available
  **Expected Result**: Different payment method can be selected and used

<!-- test
priority: medium
-->

## Tax Calculation

The system should calculate taxes correctly based on shipping address and display them in the order summary.

### Requirements

- Tax calculation engine must be functional
- Tax rates must be current for different jurisdictions
- Tax display must be clear and itemized

### Steps

- Add taxable items to cart
  **Expected Result**: Items subject to tax are in cart
- Enter shipping address in tax-applicable jurisdiction
  **Expected Result**: Address in location where tax applies is entered
- Proceed through checkout to view order summary
  **Expected Result**: Order summary displays with tax calculation
- Verify tax rate matches jurisdiction requirements
  **Expected Result**: Tax percentage is correct for the shipping location
- Check tax amount calculation (subtotal × tax rate)
  **Expected Result**: Tax dollar amount is calculated accurately
- Change shipping address to different tax jurisdiction
  **Expected Result**: Tax amount updates based on new location
- Complete order and verify tax on confirmation
  **Expected Result**: Final order shows correct tax amount

<!-- test
priority: low
-->

## Terms and Conditions Acceptance

Users should be required to accept terms and conditions before completing the checkout process.

### Requirements

- Terms and conditions must be available and accessible
- Acceptance mechanism must be mandatory
- Terms must be clearly linked and readable

### Steps

- Add items to cart and proceed through checkout
  **Expected Result**: Checkout process advances to final steps
- Locate terms and conditions acceptance section
  **Expected Result**: Terms acceptance checkbox or button is visible
- Attempt to complete order without accepting terms
  **Expected Result**: Order submission is prevented with error message
- Click on terms and conditions link
  **Expected Result**: Terms document opens in new window or modal
- Return to checkout and accept terms and conditions
  **Expected Result**: Terms acceptance is registered by the system
- Complete the order
  **Expected Result**: Order processes successfully after terms acceptance

<!-- test
priority: medium
-->

## Inventory Check During Checkout

The system should verify item availability during checkout and handle out-of-stock scenarios.

### Requirements

- Real-time inventory checking must be functional
- Out-of-stock handling procedures must be implemented
- User notification system must be operational

### Steps

- Add items to cart when they are in stock
  **Expected Result**: Items are successfully added to cart
- Begin checkout process normally
  **Expected Result**: Checkout starts with items showing as available
- Simulate item going out of stock during checkout (if possible)
  **Expected Result**: Inventory status changes during checkout process
- Attempt to complete the order
  **Expected Result**: System detects out-of-stock condition
- Verify out-of-stock notification is displayed
  **Expected Result**: Clear message indicates which items are unavailable
- Check options provided for out-of-stock items
  **Expected Result**: Options to remove item or wait for restock are offered
- Remove out-of-stock item and complete order
  **Expected Result**: Order can be completed with remaining available items

<!-- test
priority: low
-->

## Checkout Form Auto-fill

Returning users should have their previously saved information auto-filled in checkout forms.

### Requirements

- User must have previously saved checkout information
- Auto-fill functionality must be implemented
- User must be logged in to access saved information

### Steps

- Log in with account that has previously saved checkout information
  **Expected Result**: User authentication is successful
- Add items to cart and navigate to checkout
  **Expected Result**: Checkout page loads for authenticated user
- Verify shipping address fields are auto-filled
  **Expected Result**: Previously saved shipping address appears in form fields
- Check if billing address is auto-filled appropriately
  **Expected Result**: Saved billing information is populated if available
- Verify payment method options show saved methods
  **Expected Result**: Previously saved payment methods are available for selection
- Modify auto-filled information as needed
  **Expected Result**: Auto-filled fields can be edited and updated
- Complete checkout with combination of saved and new information
  **Expected Result**: Order processes with updated information

<!-- test
priority: high
-->

## Order Confirmation Email

Users should receive an order confirmation email immediately after successful checkout completion.

### Requirements

- Email system must be operational
- Order confirmation template must be configured
- Email delivery must be reliable and timely

### Steps

- Complete a successful checkout process
  **Expected Result**: Order is placed and confirmation page is displayed
- Note the email address used during checkout
  **Expected Result**: Valid email address was provided during checkout
- Check email inbox within 5 minutes of order completion
  **Expected Result**: Order confirmation email is received promptly
- Verify email contains correct order number
  **Expected Result**: Unique order number matches confirmation page
- Check that all ordered items are listed in email
  **Expected Result**: Complete item list with quantities and prices is included
- Verify shipping and billing addresses in email
  **Expected Result**: Addresses match what was entered during checkout
- Confirm total amount and payment method are correct
  **Expected Result**: Email totals and payment info match order summary
- Check for any shipping tracking information if applicable
  **Expected Result**: Tracking details or expected delivery information is provided
