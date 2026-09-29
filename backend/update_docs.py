import json

md_content = """# Sensonic Hackathon API Documentation

Base URL: `http://localhost:3000/api`

### Authentication / Identification
The API uses a simple header-based identification system for the hackathon. 
Include the following header in your requests to identify the guest (defaults to 1 if omitted):
- `x-guest-id`: `<numeric-id>`

---

## 1. Guests (`/api/guests`)

### Get All Guests
- **GET** `/guests`
- **Description:** Retrieve a list of all registered guests. Useful for building a "Login" or "Switch User" dropdown.

### Get Guest by ID
- **GET** `/guests/:id`
- **Description:** Retrieve details of a specific guest.

### Create Guest
- **POST** `/guests`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex@example.com"
  }
  ```
- **Description:** Register a new guest in the system.

---

## 2. Profile (`/api/profile`)

### Get Profile
- **GET** `/profile`
- **Headers:** `x-guest-id`
- **Description:** Returns the current stay profile and preferences for the guest.

### Update Profile
- **PUT** `/profile`
- **Headers:** `x-guest-id`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "preferences": {
      "budgetTier": "luxury",
      "pace": "relaxed"
    }
  }
  ```
- **Description:** Manually update the guest's profile preferences.

### Extract Profile
- **POST** `/profile/extract`
- **Headers:** `x-guest-id`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "prompt": "I want a relaxing spa weekend with fine dining",
    "selections": []
  }
  ```
- **Description:** Uses AI to extract profile preferences and tags based on a natural language prompt and any selections.

---

## 3. Memory (`/api/memory`)

### Get Memory
- **GET** `/memory`
- **Headers:** `x-guest-id`
- **Description:** Fetches the guest's memory reels / timeline narrative.

### Create Memory
- **POST** `/memory`
- **Headers:** `x-guest-id`
- **Description:** Triggers the AI to narrate and generate a new memory reel based on the guest's activity.

---

## 4. Plan (`/api/plan`)

### Get Current Plan
- **GET** `/plan`
- **Headers:** `x-guest-id`
- **Description:** Retrieves the guest's current active itinerary plan.

### Generate Plan
- **POST** `/plan/generate`
- **Headers:** `x-guest-id`
- **Description:** Generates a new personalized itinerary/plan for the guest based on their profile.

### Add Plan Item (Manual)
- **POST** `/plan/items`
- **Headers:** `x-guest-id`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "catalogueItemId": 1,
    "startAt": "14:00",
    "endAt": "15:00"
  }
  ```
- **Description:** Manually add a catalogue item to the itinerary without AI.

### Reshape Plan
- **POST** `/plan/reshape`
- **Headers:** `x-guest-id`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "message": "I want to change the dinner reservation to somewhere more casual"
  }
  ```
- **Description:** Asks the AI to modify or reshape the current plan based on a natural language message.

### Accept Reshape
- **POST** `/plan/reshape/:id/accept`
- **Headers:** `x-guest-id`
- **Description:** Accepts a reshaped plan alternative. Replace `:id` with the actual reshape ID.

### Delete Plan Item
- **DELETE** `/plan/items/:id`
- **Headers:** `x-guest-id`
- **Description:** Removes a specific item from the guest's itinerary.

---

## 5. Bookings (`/api/bookings`)

### Get Bookings
- **GET** `/bookings`
- **Headers:** `x-guest-id`
- **Description:** Retrieves all booking requests for the guest.

### Create Booking
- **POST** `/bookings`
- **Headers:** `x-guest-id`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "planItemId": 1,
    "withUpsell": true
  }
  ```
- **Description:** Confirms a booking for a specific plan item, optionally including an upsell.

---

## 6. Events (`/api/events`)

### Get Events Feed
- **GET** `/events`
- **Headers:** `x-guest-id`
- **Description:** Retrieves the activity feed / event history for the guest (e.g., when plans were generated or updated).

---

## 7. Catalogue (`/api/catalogue`)

### Get Catalogue
- **GET** `/catalogue`
- **Description:** Retrieves the full catalogue of available experiences, dining, and spa options at the resort. No `x-guest-id` header required.
"""

with open("api-docs.md", "w") as f:
    f.write(md_content)

print("Updated api-docs.md")

with open("postman_collection.json", "r") as f:
    data = json.load(f)

# Add Guest, Events and the new Plan routes.
guests_folder = {
  "name": "Guests",
  "item": [
    {
      "name": "Get All Guests",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/guests",
          "host": ["{{baseUrl}}"],
          "path": ["guests"]
        }
      }
    },
    {
      "name": "Get Guest by ID",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/guests/1",
          "host": ["{{baseUrl}}"],
          "path": ["guests", "1"]
        }
      }
    },
    {
      "name": "Create Guest",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Alex Johnson\",\n  \"email\": \"alex@example.com\"\n}",
          "options": {"raw": {"language": "json"}}
        },
        "url": {
          "raw": "{{baseUrl}}/guests",
          "host": ["{{baseUrl}}"],
          "path": ["guests"]
        }
      }
    }
  ]
}

events_folder = {
  "name": "Events",
  "item": [
    {
      "name": "Get Events",
      "request": {
        "method": "GET",
        "header": [{"key": "x-guest-id", "value": "{{guestId}}"}],
        "url": {
          "raw": "{{baseUrl}}/events",
          "host": ["{{baseUrl}}"],
          "path": ["events"]
        }
      }
    }
  ]
}

# Plan updates
plan_get = {
  "name": "Get Plan",
  "request": {
    "method": "GET",
    "header": [{"key": "x-guest-id", "value": "{{guestId}}"}],
    "url": {
      "raw": "{{baseUrl}}/plan",
      "host": ["{{baseUrl}}"],
      "path": ["plan"]
    }
  }
}

plan_add_item = {
  "name": "Add Plan Item",
  "request": {
    "method": "POST",
    "header": [
      {"key": "x-guest-id", "value": "{{guestId}}"},
      {"key": "Content-Type", "value": "application/json"}
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"catalogueItemId\": 1,\n  \"startAt\": \"14:00\",\n  \"endAt\": \"15:00\"\n}",
      "options": {"raw": {"language": "json"}}
    },
    "url": {
      "raw": "{{baseUrl}}/plan/items",
      "host": ["{{baseUrl}}"],
      "path": ["plan", "items"]
    }
  }
}

# Update items in the original JSON
for item in data['item']:
    if item['name'] == 'Plan':
        item['item'].insert(0, plan_get)
        item['item'].insert(2, plan_add_item)

data['item'].insert(0, guests_folder)
data['item'].insert(6, events_folder)

with open("postman_collection.json", "w") as f:
    json.dump(data, f, indent=2)

print("Updated postman_collection.json")

