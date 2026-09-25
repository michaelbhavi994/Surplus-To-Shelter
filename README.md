# 🍲 Surplus-to-Shelter

### Real-Time Food Rescue & Donation Coordination Platform

Surplus-to-Shelter is a web-based food rescue platform designed to connect food donors such as restaurants, caterers, grocery stores and campus dining facilities with nearby shelters and community organizations.

The platform helps coordinate surplus food donations, match them with suitable recipients, assign delivery drivers and track the donation journey from posting to delivery.

Built for **AmiHacks 1.0 – Amity University Jaipur**.

---

## 🚨 Problem

Every day, restaurants, caterers, grocery stores and institutional kitchens may have edible surplus food that cannot be sold or served again.

The major challenge is not always the availability of food, but the lack of a fast coordination system between:

- Food donors
- NGOs / shelters
- Volunteers / delivery drivers

Since surplus food may remain usable only for a limited period, delays can result in edible food being wasted.

---

## 💡 Our Solution

Surplus-to-Shelter provides a single platform where a donor can:

1. Post available surplus food
2. Enter quantity, location and expiry information
3. Find a suitable nearby shelter
4. Assign an available delivery driver
5. Track the pickup and delivery process
6. Monitor the overall impact of rescued food

The system is designed around a simple workflow:

**DONOR → MATCHING → DRIVER → PICKUP → DELIVERY → IMPACT**

---

# ✨ Key Features

## 🥘 1. Surplus Food Donation

Donors can quickly submit:

- Food type
- Quantity
- Pickup location
- Expiry / usable time

The donation is then added to the active donation list.

---

## 🏠 2. Smart Recipient Matching

The backend matches a donation with a suitable NGO/shelter based on:

- Donation location
- Recipient area
- Recipient capacity
- Current need level

The current MVP uses area-based matching with capacity and need as supporting factors.

### Example:

```text
Bani Park
     ↓
Seva Kitchen Jaipur

C-Scheme
     ↓
Annapurna Shelter

Vaishali Nagar
     ↓
Feeding Hands Jaipur

Malviya Nagar
     ↓
Community Food Shelter

Jagatpura
     ↓
Hope Community Centre

Mansarovar
     ↓
Roti Bank Jaipur

Sodala
     ↓
Sahara Community Shelter
