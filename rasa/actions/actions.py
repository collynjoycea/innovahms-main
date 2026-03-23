import os
import re
from typing import Any, Dict, List, Text

import requests
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet


API_BASE_URL = os.getenv("INNOVA_API_BASE_URL", "http://127.0.0.1:5000")


def _extract_customer_id(sender_id: Text) -> int | None:
    if not sender_id:
        return None
    digits = "".join(ch for ch in str(sender_id) if ch.isdigit())
    return int(digits) if digits else None


def _api_get(path: Text, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
    response = requests.get(f"{API_BASE_URL}{path}", params=params, timeout=10)
    response.raise_for_status()
    return response.json()


def _latest_booking(bookings: List[Dict[str, Any]]) -> Dict[str, Any] | None:
    if not bookings:
        return None
    return bookings[0]


class ActionCheckRoomAvailability(Action):
    def name(self) -> Text:
        return "action_check_room_availability"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        customer_id = _extract_customer_id(tracker.sender_id)
        room_type = tracker.get_slot("room_type")
        guest_count = tracker.get_slot("guest_count")
        check_in = tracker.get_slot("check_in_date")
        check_out = tracker.get_slot("check_out_date")

        try:
          if customer_id:
              payload = _api_get(f"/api/innova/recommended/{customer_id}", params={"from": check_in, "to": check_out})
              rooms = payload.get("rooms", [])
          else:
              rooms = []
        except Exception:
          rooms = []

        if room_type:
            rooms = [room for room in rooms if room_type.lower() in str(room.get("name", "")).lower()]

        if rooms:
            top_rooms = ", ".join(room.get("name", "Suite") for room in rooms[:3])
            dispatcher.utter_message(
                text=f"I found some room options you may like: {top_rooms}. "
                     f"This can help you move into the reservation form faster."
            )
        else:
            message = "I can help you check availability and recommend the best room options"
            if room_type:
                message += f" for a {room_type} stay"
            if guest_count:
                message += f" for {int(guest_count)} guest(s)"
            if check_in and check_out:
                message += f" between {check_in} and {check_out}"
            dispatcher.utter_message(text=f"{message}.")

        return []


class ActionGetAmenities(Action):
    def name(self) -> Text:
        return "action_get_amenities"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        amenity = (tracker.get_slot("amenity") or "").lower()
        amenities_map = {
            "pool": "Yes, the hotel offers pool access for guests.",
            "breakfast": "Breakfast service starts at 6:00 AM.",
            "wifi": "Yes, high-speed Wi-Fi is available for guests.",
            "parking": "Parking availability can be confirmed with the front desk upon arrival.",
            "spa": "Spa services depend on the current hotel offering and schedule.",
        }

        if amenity and amenity in amenities_map:
            dispatcher.utter_message(text=amenities_map[amenity])
        else:
            dispatcher.utter_message(
                text="I can answer FAQ topics such as pool access, breakfast schedule, Wi-Fi, parking, spa, and other hotel amenities."
            )
        return []


class ActionGetCheckinCheckoutInfo(Action):
    def name(self) -> Text:
        return "action_get_checkin_checkout_info"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(
            text="Standard check-in starts at 2:00 PM and check-out is at 12:00 PM. Early check-in or late check-out depends on availability."
        )
        return []


class ActionReservationAssistance(Action):
    def name(self) -> Text:
        return "action_reservation_assistance"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        room_type = tracker.get_slot("room_type")
        guest_count = tracker.get_slot("guest_count")
        check_in = tracker.get_slot("check_in_date")
        check_out = tracker.get_slot("check_out_date")

        parts = ["I can guide you to the most suitable room before you continue to the reservation form."]
        if room_type:
            parts.append(f"Detected room type: {room_type}.")
        if guest_count:
            parts.append(f"Detected guest count: {int(guest_count)}.")
        if check_in or check_out:
            parts.append(f"Detected stay window: {check_in or 'unspecified'} to {check_out or 'unspecified'}.")

        dispatcher.utter_message(text=" ".join(parts))
        return []


class ActionGetDigitalKeyStatus(Action):
    def name(self) -> Text:
        return "action_get_digital_key_status"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        customer_id = _extract_customer_id(tracker.sender_id)
        if not customer_id:
            dispatcher.utter_message(text="Please log in first so I can check your digital key status.")
            return []

        try:
            dashboard = _api_get(f"/api/customer/dashboard/{customer_id}")
            booking = _latest_booking(dashboard.get("user", {}).get("bookings", []))
            if not booking:
                dispatcher.utter_message(text="Your digital key will be available once you have an active confirmed booking.")
                return []

            key_payload = _api_get(f"/api/bookings/{booking['bookingId']}/digital-key", params={"customer_id": customer_id})
            dispatcher.utter_message(
                text=f"Your digital key is active for booking #INV-{booking['bookingId']}. "
                     f"Open the dashboard card and scan the QR code for room access."
            )
        except Exception:
            dispatcher.utter_message(text="I could not verify your digital key right now, but you can also check the Digital Key card on your dashboard.")
        return []


class ActionGetLoyaltySummary(Action):
    def name(self) -> Text:
        return "action_get_loyalty_summary"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        customer_id = _extract_customer_id(tracker.sender_id)
        if not customer_id:
            dispatcher.utter_message(text="Please log in first so I can fetch your loyalty points and rewards.")
            return []

        try:
            payload = _api_get(f"/api/innova/summary/{customer_id}")
            dispatcher.utter_message(
                text=f"You currently have {payload.get('points', 0)} loyalty points and your tier is {payload.get('tier', 'STANDARD')}."
            )
        except Exception:
            dispatcher.utter_message(text="I could not fetch your loyalty summary at the moment.")
        return []


class ActionGetBookingPolicy(Action):
    def name(self) -> Text:
        return "action_get_booking_policy"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        latest_intent = tracker.latest_message.get("intent", {}).get("name")
        if latest_intent == "modify_booking":
            dispatcher.utter_message(text="Bookings can be modified up to 48 hours before check-in through your dashboard.")
        else:
            dispatcher.utter_message(text="Bookings can be cancelled before the check-in date through your dashboard, subject to hotel policy.")
        return []


class ActionCaptureGuestPreferences(Action):
    def name(self) -> Text:
        return "action_capture_guest_preferences"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        room_type = tracker.get_slot("room_type")
        guest_count = tracker.get_slot("guest_count")
        check_in = tracker.get_slot("check_in_date")
        check_out = tracker.get_slot("check_out_date")

        note_parts = []
        if room_type:
            note_parts.append(f"room type={room_type}")
        if guest_count:
            note_parts.append(f"guest_count={int(guest_count)}")
        if check_in:
            note_parts.append(f"check_in={check_in}")
        if check_out:
            note_parts.append(f"check_out={check_out}")

        if note_parts:
            dispatcher.utter_message(
                text=f"I have captured your preference details for guest experience personalization: {', '.join(note_parts)}."
            )
        return []


class ActionDefaultFallback(Action):
    def name(self) -> Text:
        return "action_default_fallback"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(
            text="I can help with room availability, hotel amenities, check-in/check-out, booking guidance, digital key, and loyalty points."
        )
        return []
