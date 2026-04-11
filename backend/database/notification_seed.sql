-- Insert notification types
INSERT INTO notification_types (type_key, name, description, category, priority, email_template, sms_template, push_template) VALUES
-- System/Admin notifications
('system_maintenance', 'System Maintenance', 'Scheduled system maintenance notifications', 'SYSTEM', 'HIGH',
 'System maintenance scheduled for {{scheduled_time}}. System will be unavailable during this period.',
 'System maintenance at {{scheduled_time}}. Service interruption expected.',
 '🛠️ System maintenance scheduled for {{scheduled_time}}'),

('admin_user_registration', 'New User Registration', 'New user registration alerts for admins', 'SYSTEM', 'NORMAL',
 'New {{user_type}} registered: {{user_name}} ({{user_email}})',
 'New {{user_type}} registered: {{user_name}}',
 '👤 New {{user_type}} registered: {{user_name}}'),

('admin_payment_received', 'Payment Received', 'Payment received notifications for admins', 'PAYMENT', 'HIGH',
 'Payment received: ₱{{amount}} from {{payer_name}} for {{service_type}}',
 'Payment: ₱{{amount}} received from {{payer_name}}',
 '💰 Payment received: ₱{{amount}} from {{payer_name}}'),

-- Owner notifications
('owner_subscription_expiring', 'Subscription Expiring', 'Subscription renewal reminders for owners', 'PAYMENT', 'HIGH',
 'Your subscription expires on {{expiry_date}}. Renew now to avoid service interruption.',
 'Subscription expires {{expiry_date}}. Renew now.',
 '⏰ Subscription expires {{expiry_date}} - Renew now'),

('owner_new_booking', 'New Booking', 'New booking notifications for owners', 'BOOKING', 'NORMAL',
 'New booking: {{customer_name}} booked {{room_name}} for {{check_in_date}}',
 'New booking: {{customer_name}} - {{room_name}}',
 '📅 New booking: {{customer_name}} - {{room_name}}'),

('owner_staff_task_completed', 'Staff Task Completed', 'Task completion notifications for owners', 'STAFF', 'NORMAL',
 '{{staff_name}} completed task: {{task_description}}',
 'Task completed: {{task_description}} by {{staff_name}}',
 '✅ Task completed: {{task_description}}'),

('owner_low_inventory', 'Low Inventory Alert', 'Low inventory alerts for owners', 'INVENTORY', 'HIGH',
 'Low inventory alert: {{item_name}} ({{current_stock}} remaining)',
 'Low stock: {{item_name}} ({{current_stock}})',
 '⚠️ Low stock: {{item_name}} ({{current_stock}})'),

-- Customer notifications
('customer_booking_confirmed', 'Booking Confirmed', 'Booking confirmation for customers', 'BOOKING', 'HIGH',
 'Booking confirmed! Check-in: {{check_in_date}} at {{hotel_name}}. Reservation ID: {{booking_id}}',
 'Booking confirmed! Check-in: {{check_in_date}} at {{hotel_name}}',
 '✅ Booking confirmed for {{check_in_date}} at {{hotel_name}}'),

('customer_checkin_reminder', 'Check-in Reminder', 'Check-in reminders for customers', 'BOOKING', 'NORMAL',
 'Reminder: Check-in tomorrow at {{hotel_name}}. Room {{room_number}} ready at {{checkin_time}}',
 'Check-in reminder: Tomorrow at {{hotel_name}}, Room {{room_number}}',
 '🔔 Check-in tomorrow at {{hotel_name}} - Room {{room_number}}'),

('customer_payment_due', 'Payment Due', 'Payment due notifications for customers', 'PAYMENT', 'HIGH',
 'Payment due: ₱{{amount}} for booking {{booking_id}}. Due date: {{due_date}}',
 'Payment due: ₱{{amount}} by {{due_date}}',
 '💳 Payment due: ₱{{amount}} by {{due_date}}'),

('customer_loyalty_points', 'Loyalty Points Earned', 'Loyalty points notifications for customers', 'CUSTOMER', 'NORMAL',
 'You earned {{points}} loyalty points! Total points: {{total_points}}',
 'Earned {{points}} points! Total: {{total_points}}',
 '⭐ Earned {{points}} loyalty points! Total: {{total_points}}'),

-- Staff notifications
('staff_task_assigned', 'Task Assigned', 'New task assignments for staff', 'STAFF', 'HIGH',
 'New task assigned: {{task_description}} in {{room_number}}. Priority: {{priority}}',
 'New task: {{task_description}} - {{room_number}}',
 '📋 New task: {{task_description}} - {{room_number}}'),

('staff_shift_reminder', 'Shift Reminder', 'Shift schedule reminders for staff', 'STAFF', 'NORMAL',
 'Shift reminder: {{shift_date}} from {{start_time}} to {{end_time}}',
 'Shift: {{shift_date}} {{start_time}}-{{end_time}}',
 '⏰ Shift tomorrow: {{start_time}}-{{end_time}}'),

('staff_inventory_alert', 'Inventory Alert', 'Inventory alerts for staff', 'INVENTORY', 'HIGH',
 'Inventory alert: {{item_name}} stock is {{severity}}. Current: {{current_stock}}',
 '{{item_name}} stock {{severity}}: {{current_stock}}',
 '📦 {{item_name}} stock {{severity}}: {{current_stock}}'),

('staff_maintenance_due', 'Maintenance Due', 'Maintenance reminders for staff', 'MAINTENANCE', 'NORMAL',
 'Maintenance due: {{equipment_name}} in {{location}}. Schedule service.',
 'Maintenance due: {{equipment_name}} - {{location}}',
 '🔧 Maintenance due: {{equipment_name}} - {{location}}')

ON CONFLICT (type_key) DO NOTHING;