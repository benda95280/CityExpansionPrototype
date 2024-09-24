from datetime import datetime

class Notification:
    def __init__(self, message, timestamp=None):
        self.message = message
        self.timestamp = timestamp or datetime.now()

    def to_dict(self):
        return {
            'message': self.message,
            'timestamp': self.timestamp.isoformat()
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            message=data['message'],
            timestamp=datetime.fromisoformat(data['timestamp'])
        )

class NotificationManager:
    def __init__(self):
        self.notifications = []

    def add_notification(self, message):
        notification = Notification(message)
        self.notifications.append(notification)

    def remove_notification(self, index):
        if 0 <= index < len(self.notifications):
            del self.notifications[index]

    def get_notifications(self):
        return self.notifications

    def to_dict(self):
        return {
            'notifications': [notification.to_dict() for notification in self.notifications]
        }

    @classmethod
    def from_dict(cls, data):
        manager = cls()
        manager.notifications = [Notification.from_dict(notif_data) for notif_data in data['notifications']]
        return manager
