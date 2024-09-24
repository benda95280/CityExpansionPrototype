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
