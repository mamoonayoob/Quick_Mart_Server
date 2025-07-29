# Checkout API Documentation

## Overview
This document provides instructions for integrating the checkout API with frontend applications. The API allows users to create orders with delivery location (latitude and longitude) and choose between online payment (Stripe) or cash on delivery (COD).

## API Endpoints

### Create Order
**Endpoint:** `POST /api/orders`
**Access:** Private (Customer only)

#### Request Body
```json
{
  "orderItems": [
    {
      "product": "product_id",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "deliveryLocation": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "paymentMethod": "card", // Options: "card", "cod", "wallet"
  "deliveryType": "standard", // Options: "standard", "express"
  "notes": "Please leave at the door"
}
```

#### Response (COD Payment)
```json
{
  "success": true,
  "data": {
    // Order details
  },
  "message": "Order created successfully"
}
```

#### Response (Card Payment)
```json
{
  "success": true,
  "data": {
    "order": {
      // Order details
    },
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx"
  },
  "message": "Order created successfully. Please complete payment."
}
```

## Frontend Integration Steps

### 1. Checkout Flow
1. User adds items to cart
2. User proceeds to checkout
3. User enters shipping address
4. User provides delivery location (latitude, longitude)
5. User selects payment method (Card, COD, Wallet)
6. User confirms order
7. If COD, order is created directly
8. If Card, Stripe payment flow is initiated

### 2. Stripe Integration (for Card Payments)

#### Step 1: Install Stripe.js
```bash
npm install @stripe/stripe-js
# or
yarn add @stripe/stripe-js
```

#### Step 2: Load Stripe.js
```javascript
import { loadStripe } from '@stripe/stripe-js';

// Make sure to replace with your publishable key
const stripePromise = loadStripe('pk_test_your_publishable_key');
```

#### Step 3: Create Order and Handle Payment
```javascript
const handleCheckout = async () => {
  try {
    // 1. Create the order
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        orderItems,
        shippingAddress,
        deliveryLocation: {
          latitude: latitude, // Get from map or geolocation API
          longitude: longitude // Get from map or geolocation API
        },
        paymentMethod: 'card',
        deliveryType,
        notes
      })
    });
    
    const orderData = await response.json();
    
    if (!orderData.success) {
      throw new Error(orderData.message || 'Failed to create order');
    }
    
    // 2. Handle Stripe payment
    const stripe = await stripePromise;
    const { error } = await stripe.confirmCardPayment(orderData.data.clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: user.name,
          email: user.email
        }
      }
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    // 3. Payment successful
    // Redirect to order confirmation page
    history.push(`/order-confirmation/${orderData.data.order._id}`);
    
  } catch (error) {
    console.error('Checkout error:', error);
    setError(error.message);
  }
};
```

### 3. Getting User's Location

#### Using Browser Geolocation API
```javascript
const getUserLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeliveryLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  } else {
    console.error('Geolocation is not supported by this browser.');
  }
};
```

#### Using Map Selection
Integrate a map component (Google Maps, Mapbox, etc.) to allow users to select their delivery location.

```javascript
// Example with Google Maps
const handleMapClick = (event) => {
  setDeliveryLocation({
    latitude: event.latLng.lat(),
    longitude: event.latLng.lng()
  });
};
```

### 4. Order Tracking
After order creation, you can use the order ID to track the order status:

```javascript
const trackOrder = async (orderId) => {
  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update UI with order status
      setOrderStatus(data.data.orderStatus);
      setPaymentStatus(data.data.paymentStatus);
    }
  } catch (error) {
    console.error('Error tracking order:', error);
  }
};
```

## Error Handling
- Validate all required fields before submission
- Handle network errors gracefully
- Provide clear error messages to users
- Implement retry mechanisms for failed payments

## Security Considerations
- Never store or log sensitive payment details
- Always use HTTPS for API calls
- Validate all user inputs on both client and server sides
- Use proper authentication for all API calls
