# Innova-HMS Rasa Setup

This folder contains the real Rasa chatbot project for the customer dashboard.

## Features

- 24/7 virtual assistant for hotel FAQs
- Smart reservation assistance before opening the booking form
- NLU support for intent recognition and entity extraction
- CRM/guest experience support through customer-aware custom actions

## Main Intents

- `ask_room_availability`
- `ask_amenities`
- `ask_checkin_checkout`
- `request_booking_help`
- `ask_digital_key`
- `ask_loyalty_points`
- `modify_booking`
- `cancel_booking`

## Main Entities

- `room_type`
- `amenity`
- `guest_count`
- `check_in_date`
- `check_out_date`

## Environment

Set the Flask backend base URL for custom actions:

```powershell
$env:INNOVA_API_BASE_URL="http://127.0.0.1:5000"
```

## Install

Create a Python environment and install Rasa plus action dependencies.

```powershell
cd rasa
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install rasa==3.6.21
pip install -r actions\requirements-actions.txt
```

## Train

```powershell
cd rasa
rasa train
```

## Run Rasa Server

```powershell
cd rasa
rasa run --enable-api --cors "*"
```

This serves the REST webhook at:

`http://localhost:5005/webhooks/rest/webhook`

## Run Action Server

Open a second terminal:

```powershell
cd rasa
.venv\Scripts\Activate.ps1
rasa run actions
```

The action server runs at:

`http://localhost:5055/webhook`

## Connect to Flask Proxy

Your Flask backend already proxies chat requests to:

`RASA_WEBHOOK_URL=http://localhost:5005/webhooks/rest/webhook`

If needed, set it explicitly before starting Flask:

```powershell
$env:RASA_WEBHOOK_URL="http://127.0.0.1:5005/webhooks/rest/webhook"
```

## Suggested Test Messages

- `May pool ba kayo?`
- `How many rooms are available for 2 guests on 2026-03-25?`
- `I want to book a deluxe room for 3 guests`
- `How can I access my digital key?`
- `How many loyalty points do I have?`
