from flask import Flask, request, jsonify
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from bson.objectid import ObjectId
from datetime import datetime
import bcrypt

from werkzeug.security import generate_password_hash, check_password_hash
app = Flask(__name__)
# You should replace this with a real, randomly generated secret key
app.config['SECRET_KEY'] = 'your_random_secret_key_here'

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/learnxdb')
try:
    # The ismaster command is cheap and does not require auth.
    client.admin.command('ismaster')
except ConnectionFailure:
    print("MongoDB connection failed.")
db = client.learnxdb
users_collection = db.users


@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    password = data.get('password')
    username = data.get('username')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    # Check if username already exists
 if users_collection.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 400

    # Hash the password
    hashed_password = generate_password_hash(password)

    # Create new user document
    new_user = {
        "username": username,
        "password": hashed_password
    }

    users_collection.insert_one(new_user)

    return jsonify({"message": "User created successfully"}), 201

@app.route('/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    try:
        # Convert the user_id string to a MongoDB ObjectId
        user_object_id = ObjectId(user_id)
    except Exception as e:
        return jsonify({"error": "Invalid user ID format"}), 400

    user = users_collection.find_one({"_id": user_object_id})

    if user:
        # Convert the ObjectId to a string for JSON serialization
        user['_id'] = str(user['_id'])
        # Remove the hashed password before returning
        user.pop('password', None)
        return jsonify({"user": user}), 200
    else:
        return jsonify({"error": "User not found"}), 404

@app.route('/sessions', methods=['GET'])
def get_sessions():
    """Fetches all sessions from the database."""
    db = client.learnxdb
    sessions_collection = db.sessions
    sessions = list(sessions_collection.find({}))
    for session in sessions:
        session['_id'] = str(session['_id']) # Convert ObjectId to string for JSON serialization
    return jsonify({"sessions": sessions}), 200

@app.route('/book-session', methods=['POST'])
def book_session():
    try:
 db = client.learnxdb
        data = request.get_json()
        # Assuming the frontend sends session_id, user_id, booking_date, booking_time
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        booking_date = data.get('booking_date')
        booking_time = data.get('booking_time')

        if not all([session_id, user_id, booking_date, booking_time]):
            return jsonify({"error": "Missing booking details"}), 400

        # Optional: Validate session_id and user_id exist in their respective collections
        # For now, we'll just proceed with inserting the booking.

        bookings_collection = db['bookings']
        booking_details = {
            "session_id": session_id,
            "user_id": user_id,
            "booking_date": booking_date,
 "booking_time": booking_time,
            "created_at": datetime.utcnow() # Add a timestamp
        }
        bookings_collection.insert_one(booking_details)

        return jsonify({"message": "Session booked successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/conversations/<user_id>', methods=['GET'])
def get_conversations(user_id):
    """Fetches all conversations for a given user ID."""
    try:
 db = client.learnxdb
        conversations_collection = db['conversations']

        # Find conversations where the user_id is in the 'participants' array
        conversations = list(conversations_collection.find({"participants": user_id}))

        # Convert ObjectId to string for JSON serialization
        for conversation in conversations:
            conversation['_id'] = str(conversation['_id'])
        return jsonify({"conversations": conversations}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/messages/<conversation_id>', methods=['GET'])
def get_messages(conversation_id):
    """Fetches all messages for a given conversation ID."""
    try:
 db = client.learnxdb
        messages_collection = db['messages']

        # Find messages within the specified conversation_id
        messages = list(messages_collection.find({"conversation_id": conversation_id}).sort("timestamp")) # Assuming a timestamp field

        # Convert ObjectId to string for JSON serialization
        for message in messages:
            message['_id'] = str(message['_id'])
        return jsonify({"messages": messages}), 200

@app.route('/send-message', methods=['POST'])
def send_message():
 try:
        db = client.learnxdb
        data = request.get_json()
        conversation_id = data.get('conversation_id')
        sender_id = data.get('sender_id')
        content = data.get('content')

 if not all([conversation_id, sender_id, content]):
 return jsonify({"error": "Missing required fields"}), 400

 messages_collection = db['messages']
        new_message = {
 "conversation_id": conversation_id,
 "sender_id": sender_id,
 "content": content,
 "timestamp": datetime.utcnow()
        }
        result = messages_collection.insert_one(new_message)
 return jsonify({"message": "Message sent successfully", "message_id": str(result.inserted_id)}), 201
 except Exception as e:
 return jsonify({"error": str(e)}), 500

@app.route('/change-password', methods=['POST'])
def change_password():
    try:
        data = request.get_json()
        user_id = data.get('userId') # Assuming userId is sent in the request
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')

        if not all([user_id, current_password, new_password]):
            return jsonify({"error": "Missing user ID, current password, or new password"}), 400

        # Find the user by ID
        user = users_collection.find_one({"_id": ObjectId(user_id)})

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Verify the current password
        if not check_password_hash(user['password'], current_password):
            return jsonify({"error": "Incorrect current password"}), 401

        # Hash the new password
        hashed_new_password = generate_password_hash(new_password)

        # Update the user's password in the database
        users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"password": hashed_new_password}})
    return jsonify({"message": "Password change request received"}), 200

@app.route('/save-notification-preferences', methods=['POST'])
def save_notification_preferences():
    try:
        data = request.get_json()
        user_id = data.get('user_id') # Assuming user_id is sent in the request
 preferences = data.get('preferences') # Assuming preferences is a dictionary

 if not all([user_id, preferences is not None]):
 return jsonify({"error": "Missing user ID or preferences"}), 400

 # Find the user by ID
 user = users_collection.find_one({"_id": ObjectId(user_id)})

 if not user:
 return jsonify({"error": "User not found"}), 404

 # Update the user's notification preferences in the database
        users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"notification_preferences": preferences}})
    except Exception as e:
 return jsonify({"error": str(e)}), 500

    return jsonify({"message": "Notification preferences saved"}), 200

@app.route('/save-privacy-settings', methods=['POST'])
def save_privacy_settings():
    try:
        data = request.get_json()
        user_id = data.get('user_id')  # Assuming user_id is sent in the request
        privacy_settings = data.get('privacy_settings')  # Assuming privacy_settings is a dictionary

        if not all([user_id, privacy_settings is not None]):
            return jsonify({"error": "Missing user ID or privacy settings"}), 400

        # Find the user by ID
        user = users_collection.find_one({"_id": ObjectId(user_id)})

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Update the user's privacy settings in the database
        users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"privacy_settings": privacy_settings}})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    # Add logic here to save privacy settings to the user's document in the DB

    return jsonify({"message": "Privacy settings saved"}), 200

@app.route('/admin/users', methods=['GET'])
def admin_get_users():
    # In a real app, you'd add authentication/authorization to ensure only admins can access this
    db = client.learnxdb
 users = list(users_collection.find({}, {'password': 0})) # Fetch all users, exclude password
    for user in users:
        user['_id'] = str(user['_id'])
    return jsonify({"users": users}), 200

@app.route('/admin/users/<user_id>', methods=['GET'])
def admin_get_user(user_id):
    try:
        user_object_id = ObjectId(user_id)
        db = client.learnxdb
    except:
        return jsonify({"error": "Invalid user ID format"}), 400

    user = users_collection.find_one({"_id": user_object_id}, {'password': 0})
    if user:
        user['_id'] = str(user['_id'])
        return jsonify({"user": user}), 200
    return jsonify({"error": "User not found"}), 404

@app.route('/admin/users/<user_id>', methods=['PUT'])
def admin_update_user(user_id):
    # In a real app, you'd add authentication/authorization and proper data validation
    data = request.get_json()
    db = client.learnxdb
    try:
        user_object_id = ObjectId(user_id)
    except:
        return jsonify({"error": "Invalid user ID format"}), 400

    # Example update - you'd handle specific fields based on the admin panel
    update_result = users_collection.update_one(
        {"_id": user_object_id},
        {"$set": data}
    )

    if update_result.modified_count > 0:
        return jsonify({"message": "User updated successfully"}), 200
    return jsonify({"message": "User not found or no changes made"}), 404

@app.route('/admin/users/<user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    # In a real app, you'd add authentication/authorization and handle related data (sessions, messages, etc.)
    db = client.learnxdb
    try:
        user_object_id = ObjectId(user_id)
    except:
        return jsonify({"error": "Invalid user ID format"}), 400

    delete_result = users_collection.delete_one({"_id": user_object_id})

    if delete_result.deleted_count > 0:
        return jsonify({"message": "User deleted successfully"}), 200
    return jsonify({"error": "User not found"}), 404

@app.route('/admin/users/<user_id>/suspend', methods=['POST'])
def admin_suspend_user(user_id):
    # In a real app, you'd add authentication/authorization and implement suspension logic (e.g., setting a status flag)
    db = client.learnxdb
    try:
        user_object_id = ObjectId(user_id)
    except:
        return jsonify({"error": "Invalid user ID format"}), 400

    # Example: Update user status to 'suspended'
    update_result = users_collection.update_one(
        {"_id": user_object_id},
        {"$set": {"status": "suspended"}}
    )
    if update_result.modified_count > 0:
        return jsonify({"message": f"User {user_id} suspended"}), 200
    return jsonify({"message": "User not found or already suspended"}), 404
    
@app.route('/admin/sessions', methods=['GET'])
def get_all_sessions():
    """Fetches all sessions from the database."""
 db = client.learnxdb
    sessions_collection = db.sessions
    sessions = list(sessions_collection.find({}))
    for session in sessions:
        session['_id'] = str(session['_id']) # Convert ObjectId to string for JSON serialization
    return jsonify({"sessions": sessions}), 200

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not all([username_or_email, password]):
        return jsonify({"error": "Missing username/email or password"}), 400

    user = users_collection.find_one({
        "$or": [
            {"username": username_or_email},
            {"email": username_or_email}
        ]
    })

    if user and check_password_hash(user['password'], password):
        # In a real application, you would create and return a JWT or session token
        # and handle user sessions for authentication.
        # For this basic example, we'll just return a success message and user ID.
        return jsonify({"message": "Login successful", "user_id": str(user['_id'])}), 200
    else:
        return jsonify({"error": "Invalid username/email or password"}), 401


# This route was not in the original plan, but is included in the provided code.
def get_dashboard_data(user_id):
    # In a real application, you would fetch real data for the user's dashboard
    # from your MongoDB collections based on the user_id.
    # For now, return placeholder data.

    try:
        # Optional: Verify the user_id exists if you want to return a 404 for invalid users
        user_object_id = ObjectId(user_id)
        user = users_collection.find_one({"_id": user_object_id})
        if not user:
            return jsonify({"error": "User not found"}), 404

    except Exception as e:
        return jsonify({"error": "Invalid user ID format"}), 400

    # Placeholder data
    dashboard_data = {
        "notifications": [
            {"text": "New message from John Doe", "link": "/chat/...", "time": "2h ago"},
            {"text": "Your session with Jane Smith is tomorrow", "link": "/schedule/...", "time": "1d ago"},
        ],
        "progress": [{"skill": "JavaScript Fundamentals", "percentage": 75}, {"skill": "UI/UX Design Principles", "percentage": 40}],
        "skills": ["Python Programming", "Web Development", "Data Science"],
        "ongoing_sessions": [{"mentor": "Jane", "topic": "Web Development", "time": "3:00 PM"}],
        "upcoming_opportunities": [{"text": "Join Machine Learning study group", "date": "15th May"}],
    }
    return jsonify(dashboard_data), 200
if __name__ == '__main__':
    app.run(debug=True)